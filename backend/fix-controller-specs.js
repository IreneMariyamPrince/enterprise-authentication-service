const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else results.push(file);
  });
  return results;
};

const files = walk(__dirname + '/src').filter(f => f.endsWith('.controller.spec.ts') && !f.includes('app.controller'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Remove the useless PrismaService import we added earlier
  content = content.replace(/import \{ PrismaService \} from '\.\.\/prisma\/prisma\.service';\n/, '');

  // Find the controller name
  const controllerMatch = content.match(/import \{ ([A-Za-z]+Controller) \} from/);
  if (controllerMatch) {
    const controllerName = controllerMatch[1];
    const serviceName = controllerName.replace('Controller', 'Service');
    const serviceImportPath = `./${controllerName.replace('Controller', '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}.service`;

    // Add Service import
    content = content.replace(
      `import { ${controllerName} } from './${controllerName.replace('Controller', '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}.controller';`,
      `import { ${controllerName} } from './${controllerName.replace('Controller', '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}.controller';\nimport { ${serviceName} } from '${serviceImportPath}';`
    );

    // Mock Service provider
    content = content.replace(
      `controllers: [${controllerName}],`,
      `controllers: [${controllerName}],\n      providers: [{ provide: ${serviceName}, useValue: {} }],`
    );

    fs.writeFileSync(file, content);
  }
}

// Fix app.controller.spec.ts manually
const appSpecFile = path.join(__dirname, 'src', 'app.controller.spec.ts');
let appContent = fs.readFileSync(appSpecFile, 'utf8');
appContent = appContent.replace(/import \{ PrismaService \} from '\.\.\/prisma\/prisma\.service';/, "import { PrismaService } from './prisma/prisma.service';");
fs.writeFileSync(appSpecFile, appContent);

console.log('Fixed controller specs!');
