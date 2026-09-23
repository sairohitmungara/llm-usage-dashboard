import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import "dotenv/config";

import pool from "./db";
import usageRouter from "./usage";
import { processText, calculateCost } from "./llm";
import { extractTextFromPdf } from "./pdf";

const app = express();

const PORT = Number(process.env.PORT || 5001);

app.use(cors());
app.use(express.json());

app.use("/api", usageRouter);

const uploadsDirectory = path.join(process.cwd(), "uploads");

fs.mkdirSync(uploadsDirectory, {
  recursive: true,
});

const upload = multer({
  dest: uploadsDirectory,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      path.extname(file.originalname).toLowerCase() === ".pdf";

    if (!isPdf) {
      return callback(new Error("Only PDF files are allowed"));
    }

    callback(null, true);
  },
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "llm-usage-dashboard",
  });
});

async function saveUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  source: "text" | "pdf";
}) {
  await pool.query(
    `
      INSERT INTO usage_logs (
        model,
        input_tokens,
        output_tokens,
        total_tokens,
        request_count,
        cost,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      params.model,
      params.inputTokens,
      params.outputTokens,
      params.totalTokens,
      1,
      params.cost,
      params.source,
    ],
  );
}

app.post("/api/process", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "Text input is required",
      });
    }

    if (!text.trim()) {
      return res.status(400).json({
        error: "Text input cannot be empty",
      });
    }

    const result = await processText(text);

    const inputTokens = result.usage.input_tokens;
    const outputTokens = result.usage.output_tokens;
    const totalTokens = result.usage.total_tokens;

    const cost = calculateCost(
      result.model,
      inputTokens,
      outputTokens,
    );

    await saveUsage({
      model: result.model,
      inputTokens,
      outputTokens,
      totalTokens,
      cost,
      source: "text",
    });

    return res.json({
      result: result.text,

      usage: {
        model: result.model,
        inputTokens,
        outputTokens,
        totalTokens,
        requestCount: 1,
        cost,
      },
    });
  } catch (error) {
    console.error("Text processing error:", error);

    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to process text",
    });
  }
});

app.post(
  "/api/process-pdf",
  upload.single("file"),
  async (req, res) => {
    let filePath: string | undefined;

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "PDF file is required",
        });
      }

      filePath = req.file.path;

      const extractedText = await extractTextFromPdf(filePath);

      if (!extractedText.trim()) {
        return res.status(400).json({
          error: "No readable text was found in the PDF",
        });
      }

      const result = await processText(extractedText);

      const inputTokens = result.usage.input_tokens;
      const outputTokens = result.usage.output_tokens;
      const totalTokens = result.usage.total_tokens;

      const cost = calculateCost(
        result.model,
        inputTokens,
        outputTokens,
      );

      await saveUsage({
        model: result.model,
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        source: "pdf",
      });

      return res.json({
        result: result.text,

        usage: {
          model: result.model,
          inputTokens,
          outputTokens,
          totalTokens,
          requestCount: 1,
          cost,
        },
      });
    } catch (error) {
      console.error("PDF processing error:", error);

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to process PDF",
      });
    } finally {
      if (filePath) {
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // File may already have been removed.
        }
      }
    }
  },
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Server error:", error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  },
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`,
  );
});