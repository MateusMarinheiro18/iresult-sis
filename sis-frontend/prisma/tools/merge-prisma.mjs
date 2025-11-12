// prisma/tools/merge-prisma.mjs
import fs from 'fs/promises';
import path from 'path';

const root = process.cwd();
const prismaDir = path.join(root, 'prisma');
const modelsDir = path.join(prismaDir, 'models');
const outPath = path.join(prismaDir, 'schema.prisma');

async function merge() {
  // read header from existing schema.prisma (keep generator/datasource)
  let header = '';
  try {
    const existing = await fs.readFile(outPath, 'utf8');
    // take header up to the comment line that indicates merging area if exists
    const marker = '// models will be merged from prisma/models/*.prisma';
    const idx = existing.indexOf(marker);
    if (idx !== -1) {
      header = existing.slice(0, idx + marker.length) + '\n\n';
    } else {
      header = existing + '\n\n';
    }
  } catch (err) {
    // if schema.prisma doesn't exist, create a default header
    header = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// models will be merged from prisma/models/*.prisma

`;
  }

  // read all .prisma files inside prisma/models sorted alphabetically
  const files = await fs.readdir(modelsDir);
  const modelFiles = files.filter(f => f.endsWith('.prisma')).sort();

  let models = '';
  for (const f of modelFiles) {
    const content = await fs.readFile(path.join(modelsDir, f), 'utf8');
    models += `// ---- ${f} ----\n` + content.trim() + '\n\n';
  }

  const final = header + models;
  await fs.writeFile(outPath, final, 'utf8');
  console.log(`Merged ${modelFiles.length} model(s) into prisma/schema.prisma`);
}

merge().catch(err => {
  console.error(err);
  process.exit(1);
});
