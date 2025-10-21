import * as migration_20251019_201800_fix_import_jobs_constraint from './20251019_201800_fix_import_jobs_constraint';
import * as migration_20251019_202000_remove_knowledge_base from './20251019_202000_remove_knowledge_base';
import * as migration_20251019_202100_clean_locked_documents_rels from './20251019_202100_clean_locked_documents_rels';
import * as migration_20251021_154948 from './20251021_154948';

export const migrations = [
  {
    up: migration_20251019_201800_fix_import_jobs_constraint.up,
    down: migration_20251019_201800_fix_import_jobs_constraint.down,
    name: '20251019_201800_fix_import_jobs_constraint',
  },
  {
    up: migration_20251019_202000_remove_knowledge_base.up,
    down: migration_20251019_202000_remove_knowledge_base.down,
    name: '20251019_202000_remove_knowledge_base',
  },
  {
    up: migration_20251019_202100_clean_locked_documents_rels.up,
    down: migration_20251019_202100_clean_locked_documents_rels.down,
    name: '20251019_202100_clean_locked_documents_rels',
  },
  {
    up: migration_20251021_154948.up,
    down: migration_20251021_154948.down,
    name: '20251021_154948'
  },
];
