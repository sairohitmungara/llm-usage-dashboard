import { Router } from "express";
import pool from "./db";

const router = Router();

router.get("/usage", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        model,
        input_tokens,
        output_tokens,
        total_tokens,
        request_count,
        cost,
        source,
        created_at
      FROM usage_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Usage fetch error:", error);

    res.status(500).json({
      error: "Failed to fetch usage history",
    });
  }
});

export default router;