import * as migration_20251019_201543_fix_import_jobs_constraint from './20251019_201543_fix_import_jobs_constraint';

export const migrations = [
  {
    up: migration_20251019_201543_fix_import_jobs_constraint.up,
    down: migration_20251019_201543_fix_import_jobs_constraint.down,
    name: '20251019_201543_fix_import_jobs_constraint'
  },
];
