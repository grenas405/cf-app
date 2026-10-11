/**
 * The tooling's only I/O: list and read files, write to stdout. Kept apart
 * from the pure fact-finding so that part can be tested without a disk.
 *
 * @module
 */

/** Every file under `dir`, recursively, as sorted repo-relative paths. */
export async function listFiles(dir: string): Promise<string[]> {
  const paths: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) paths.push(...await listFiles(path));
    else if (entry.isFile) paths.push(path);
  }
  return paths.sort();
}

/** Read each path as UTF-8 text. */
export function readAll(
  paths: readonly string[],
): Promise<{ path: string; source: string }[]> {
  return Promise.all(
    paths.map(async (path) => ({
      path,
      source: await Deno.readTextFile(path),
    })),
  );
}

/** Write text to stdout, so output composes with pipes and redirects. */
export async function writeStdout(text: string): Promise<void> {
  await ReadableStream.from([text])
    .pipeThrough(new TextEncoderStream())
    .pipeTo(Deno.stdout.writable);
}
