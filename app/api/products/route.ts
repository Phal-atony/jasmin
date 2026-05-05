import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const productSchema = z.object({
  gameId: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().int().min(0),
  bonus: z.number().int().min(0).default(0),
  priceUsd: z.number().positive(),
  badge: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),  // ← was "image"
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});