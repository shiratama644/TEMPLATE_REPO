/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed',
      from: {},
      to: { circular: true }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules should be avoided',
      from: { orphan: true, pathNot: ['^src/index.ts$'] },
      to: {}
    },
    {
      name: 'no-deprecated-core',
      severity: 'warn',
      comment: 'Do not use deprecated core modules',
      from: {},
      to: { dependencyTypes: ['core'], moreThanOneDependencyType: true, path: '^(fs|path|os|child_process)$' }
    },
    {
      name: 'not-to-test',
      severity: 'info',
      comment: 'Source should not depend on test files',
      from: { pathNot: ['_tests_', 'e2e', '\\.test\\.ts$', '\\.spec\\.ts$', 'bench'] },
      to: { path: ['_tests_', 'e2e', '\\.test\\.ts$', '\\.spec\\.ts$', 'bench'] }
    },
    {
      name: 'no-non-package-json-deps',
      severity: 'error',
      comment: 'Do not import from outside package.json dependencies',
      from: {},
      to: { dependencyTypes: ['unknown'] }
    },
    {
      name: 'not-to-dev-deps',
      severity: 'warn',
      comment: 'src should not depend on devDependencies (except type-only)',
      from: { path: '^src/' },
      to: { dependencyTypes: ['npm-dev'] }
    },
    {
      name: 'no-scripts-to-src',
      severity: 'warn',
      comment: 'scripts should not import from src (template boundary)',
      from: { path: '^scripts/' },
      to: { path: '^src/' }
    },
    {
      name: 'no-src-to-scripts',
      severity: 'error',
      comment: 'src must not import from scripts (src is independent library)',
      from: { path: '^src/' },
      to: { path: '^scripts/' }
    },
    {
      name: 'no-docs-to-code',
      severity: 'error',
      comment: 'docs must not import code (docs are spec only)',
      from: { path: '^docs/' },
      to: { path: '^(src|scripts)/' }
    },
    {
      name: 'no-tests-to-bench-e2e-cross',
      severity: 'warn',
      comment: 'tests should not import from e2e/bench directly (except shared lib)',
      from: { path: '^_tests_/' },
      to: { path: '^(e2e|bench)/', pathNot: ['scripts/lib'] }
    }
  ],
  options: {
    doNotFollow: {
      path: ['node_modules']
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      },
      archi: {
        collapsePattern: '^(packages|src|scripts|_tests_|e2e)/[^/]+|^node_modules/[^/]+'
      },
      'err-long': {
        highlights: true
      }
    }
  }
}
