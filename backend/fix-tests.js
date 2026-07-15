const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
};

const srcDir = path.join(__dirname, 'src');
const files = walk(srcDir).filter((f) => f.endsWith('.spec.ts'));

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Test.createTestingModule') && !content.includes('PrismaService')) {
    if (content.includes("from './")) {
      content = `import { PrismaService } from '../prisma/prisma.service';\n` + content;
    } else {
      content = `import { PrismaService } from '../../prisma/prisma.service';\n` + content;
    }
    content = content.replace(/providers:\s*\[([^\]]+)\]/, "providers: [$1, { provide: PrismaService, useValue: {} }]");
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed tests.');
