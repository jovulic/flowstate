import zlib from "zlib";
import { Type, Static } from "@sinclair/typebox";

/**
 * {@link CompressedDataSchema} defines the expected structure of compressed
 * data.
 */
export const CompressedDataSchema = Type.Object({
  compressed: Type.String(),
  algorithm: Type.Literal("brotli"),
});
export type CompressedData = Static<typeof CompressedDataSchema>;

/**
 * {@link compress} compresses a string using Brotli.
 */
export function compress(data: string): string {
  return zlib.brotliCompressSync(data).toString("base64");
}

/**
 * {@link decompress} decompresses a Brotli-compressed base64 string.
 */
export function decompress(data: string): string {
  return zlib
    .brotliDecompressSync(Buffer.from(data, "base64"))
    .toString("utf-8");
}
