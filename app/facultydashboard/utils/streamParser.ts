/**
 * Reads a streaming report response, strips the metadata header, and
 * calls onChunk with the accumulating report text as it arrives.
 * Returns the full report string when streaming is complete.
 *
 * Error handling: if the backend sends an error chunk (e.g. "Error: AI service
 * request timed out.") before the __METADATA_END__ marker appears, the error
 * is immediately emitted via onChunk and returned so the caller can stop the
 * loading spinner. Errors split across multiple chunks are also handled by
 * checking the full accumulated buffer.
 */
export async function readReportStream(
  response: Response,
  signal: AbortSignal,
  onChunk: (fullTextSoFar: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let fullReport = "";
  let metaBuffer = "";
  let metadataStripped = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (signal.aborted) {
        reader.cancel();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      if (!metadataStripped) {
        metaBuffer += chunk;

        // Detect backend error payloads that will never contain __METADATA_END__.
        // Check after each chunk accumulation so split-chunk errors are caught too.
        if (/^Error:/i.test(metaBuffer.trimStart())) {
          const errorText = metaBuffer.trimStart();
          reader.cancel();
          onChunk(errorText);
          return errorText;
        }

        const endIdx = metaBuffer.indexOf("__METADATA_END__");
        if (endIdx !== -1) {
          metadataStripped = true;
          const afterMeta = metaBuffer.slice(endIdx + "__METADATA_END__".length);
          if (afterMeta) {
            fullReport += afterMeta;
            onChunk(fullReport);
          }
        }
        // While still buffering metadata, don't emit anything
      } else {
        fullReport += chunk;
        onChunk(fullReport);
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  // If the stream did not contain __METADATA_END__, emit the full buffered text
  if (!metadataStripped && metaBuffer.trim().length > 0) {
    fullReport = metaBuffer;
    onChunk(fullReport);
  }

  return fullReport;
}
