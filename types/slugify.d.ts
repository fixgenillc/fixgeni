declare module "slugify" {
  function slugify(
    string: string,
    options?: { replacement?: string; lower?: boolean; strict?: boolean }
  ): string;
  export = slugify;
}
