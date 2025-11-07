# Supabase Export

**Export Date:** 2025-11-05T01:13:12.347Z  
**Project ID:** vrucbxdudchboznunndz

## Summary

- **Edge Functions:** 33 functions (167.9 KB)
- **Database Migrations:** 105 migrations (217.15 KB)
- **Configuration:** 757 Bytes


## Structure

```
supabase-export/
├── functions/          # Edge functions (33 functions)
├── migrations/         # Database migrations (105 files)
├── config.toml         # Supabase configuration
├── manifest.json       # Export manifest
└── README.md           # This file
```

## Edge Functions

- **_shared** (1 files, 158 Bytes)
- **analyze-financials** (1 files, 5.31 KB)
- **bork-aggregate-data** (1 files, 4.51 KB)
- **bork-api-connection-test** (1 files, 2.74 KB)
- **bork-api-simple-test** (1 files, 3.04 KB)
- **bork-api-sync** (1 files, 9.74 KB)
- **bork-api-sync-minimal** (1 files, 1.19 KB)
- **bork-api-sync-test** (1 files, 1.25 KB)
- **bork-api-test** (1 files, 12.27 KB)
- **bork-backfill-orchestrator** (1 files, 4.44 KB)
- **bork-backfill-worker** (1 files, 5.31 KB)
- **bork-incremental-sync** (1 files, 7.31 KB)
- **bork-sync-daily** (1 files, 10.87 KB)
- **bork-sync-master-data** (1 files, 4.72 KB)
- **bork-sync-range** (1 files, 6.08 KB)
- **check-locations** (1 files, 2.26 KB)
- **check-records-per-day** (1 files, 3.91 KB)
- **debug-db** (1 files, 3.19 KB)
- **debug-env** (1 files, 1.48 KB)
- **eitje-aggregate-data** (1 files, 7.16 KB)
- **eitje-api-sync** (1 files, 25.26 KB)
- **eitje-backfill-cleanup** (1 files, 3.81 KB)
- **eitje-backfill-orchestrator** (1 files, 4.43 KB)
- **eitje-backfill-reset** (1 files, 1.77 KB)
- **eitje-backfill-worker** (1 files, 8.54 KB)
- **eitje-gap-detector** (1 files, 2.81 KB)
- **eitje-incremental-sync** (1 files, 5.04 KB)
- **finance-import-orchestrator** (1 files, 1.67 KB)
- **finance-validation-middleware** (1 files, 1.95 KB)
- **generate-recipe** (1 files, 2.12 KB)
- **process-bork-raw-data** (1 files, 5.61 KB)
- **scan-package-usage** (1 files, 1.66 KB)
- **smart-calculations** (1 files, 6.3 KB)

## Database Migrations

- 20241025_add_performance_indexes.sql (973 Bytes)
- 20250103000001_create_unified_users_teams.sql (12.51 KB)
- 20250118000000_create_bork_raw_data.sql (1.45 KB)
- 20250119000000_rename_bork_sales_data_original.sql (1.79 KB)
- 20250119000001_fix_bork_sales_data_rls.sql (1.28 KB)
- 20250119000001_smart_calculations_schema.sql (3.08 KB)
- 20250120000000_enable_extensions.sql (575 Bytes)
- 20250120000001_fix_net_extension_usage.sql (3.83 KB)
- 20250120000002_create_master_data_tables.sql (4.17 KB)
- 20250125_create_bork_sales_aggregated.sql (1 Bytes)
- 20250125_create_bork_sales_aggregated_simple.sql (2.66 KB)
- 20250125_fix_master_data_rls_policies.sql (1.83 KB)
- 20250127000000_create_powerbi_pnl_aggregated_data.sql (2.86 KB)
- 20250127000001_create_powerbi_pnl_aggregated.sql (4.75 KB)
- 20250128000000_create_eitje_aggregated_tables.sql (6.82 KB)
- 20250128000001_create_eitje_raw_tables.sql (14.31 KB)
- 20250131000000_delete_all_hnhg_locations.sql (296 Bytes)
- 20250131000001_setup_bork_eitje_cron_jobs.sql (4.85 KB)
- 20250131000002_fix_eitje_sync_config_columns.sql (2.96 KB)
- 20250131000003_create_eitje_incremental_cron_job.sql (3.11 KB)
- 20250131000004_create_eitje_sync_state.sql (1.99 KB)
- 20250930000045_7377a44a-1bcc-4980-8fc3-cae7e1ad2b33.sql (1.51 KB)
- 20250930100050_2b6bb082-f5e8-4f55-b3dd-a7e675a9322c.sql (238 Bytes)
- 20251002234003_a7b4b58a-5a76-482e-8ad1-a89f5617dca3.sql (1.22 KB)
- 20251003000112_3c2da54d-00cb-44b1-aafc-1fcb31cc9a8a.sql (1.28 KB)
- 20251003000652_9ec9854a-2a50-407f-a1a5-b1a5cdf092b7.sql (386 Bytes)
- 20251003004037_cb55d576-e794-4c7d-b792-5b27a0790734.sql (316 Bytes)
- 20251003133422_496575b4-b4f6-4769-a082-38a3eda28bc3.sql (1 KB)
- 20251003133908_7b4b7101-05c7-415d-b45a-2216f8e12b28.sql (305 Bytes)
- 20251005224106_4e36b524-f3b2-45fc-9309-38a711d6ed42.sql (1.34 KB)
- 20251005231626_023a25fc-d325-498f-adc0-b71a55074bf5.sql (163 Bytes)
- 20251006113214_e6b881fd-a350-4997-b84f-7a02de5f53dc.sql (1.19 KB)
- 20251006113640_fb97b353-726a-4c23-be0b-0685e5c90467.sql (140 Bytes)
- 20251006115052_b21d6ade-a11e-4d2f-8173-c7eab7e5d3ab.sql (2.18 KB)
- 20251006125345_a13dc7f7-6667-4635-a44f-7dd30f3ab026.sql (2.32 KB)
- 20251006143041_28a1730b-2f07-493c-9689-0c1673aef658.sql (2.44 KB)
- 20251006145015_10e1a6e6-6f3e-4b62-b9e5-57c2561aa175.sql (446 Bytes)
- 20251006163207_b6e19eed-6ef0-4ee3-a511-72db28549b73.sql (2.57 KB)
- 20251006205438_1582afcc-fb7b-49a5-ac0b-6332d90648f1.sql (1.01 KB)
- 20251006232944_255e65ee-2f41-4624-92ee-c3664ba453c3.sql (11.89 KB)
- 20251006233641_0dcc5c9f-8d11-4534-94be-21ce867f04d3.sql (3.49 KB)
- 20251007002358_a5adcbde-01d0-4427-a247-762c24395aa2.sql (880 Bytes)
- 20251007004817_38fa1ccd-4eb6-4559-92cf-bd77f20d40da.sql (1.84 KB)
- 20251007113929_cf9b164e-af88-4982-854a-994a186b2bb2.sql (1.39 KB)
- 20251007174550_7141a809-1cfc-4aa2-86d4-0a7cdaea7e3f.sql (13.06 KB)
- 20251007180225_b7c5f9d6-2b7b-4c2a-81fa-da5bb0b7a078.sql (1.28 KB)
- 20251008223443_306eda94-c2ac-4396-81b8-4809e93c82bd.sql (654 Bytes)
- 20251008231724_02b586f9-8aec-4977-b97c-80b04e02258e.sql (342 Bytes)
- 20251008235921_98f8330e-a66a-492d-928d-28cb7a2bc18f.sql (6.32 KB)
- 20251009011309_30cd803e-b410-4df1-b298-2bfcfd732574.sql (208 Bytes)
- 20251011012733_27542b4a-c74f-4b1d-b028-024cba680a5f.sql (4.8 KB)
- 20251011035002_2e821fad-b786-4c10-a8b9-3db780aba0d9.sql (192 Bytes)
- 20251011040901_6b29903e-a22e-4079-bd1e-0a105a658504.sql (280 Bytes)
- 20251011171813_bfc8c7c4-b233-44f7-b4d4-700c11f4bc0f.sql (1.02 KB)
- 20251011181515_1d6371ad-cbc1-44d1-b3eb-a5212f724301.sql (178 Bytes)
- 20251011183000_be445397-bd6c-4bb7-9037-5de464a843c2.sql (190 Bytes)
- 20251011233416_229b746a-a18d-4987-a16c-6011b2da61fc.sql (1.74 KB)
- 20251012000259_2dda3523-20bc-43b7-a771-661b2e9480df.sql (1.25 KB)
- 20251012004141_2d16022e-625b-4f24-9f1c-dbee879b8877.sql (386 Bytes)
- 20251012014145_45e6a95b-1ab1-405a-8e61-802c279e4d88.sql (2.75 KB)
- 20251012133313_e10baa32-918d-4244-b6e1-db549885ad5b.sql (464 Bytes)
- 20251013005823_50a5f757-31a4-459f-b97d-145cceaebc57.sql (3.34 KB)
- 20251013005856_ddacd0da-5301-4c72-8657-57ec2a32dfd1.sql (112 Bytes)
- 20251013094945_1fedac5c-38c6-49e9-a92f-20c9bc87e236.sql (625 Bytes)
- 20251013095001_8d5d3129-1e0e-4b63-aaef-92248f55c885.sql (542 Bytes)
- 20251013095511_04c7b441-791c-49e3-8fce-4fc0f815688d.sql (677 Bytes)
- 20251013100230_d8300d22-43d5-437c-945d-183ae9ff5b3a.sql (806 Bytes)
- 20251013163133_b6692894-bfda-4f99-86f3-32029df8f2e6.sql (4.48 KB)
- 20251014213723_f0b73e9f-addc-46b5-af14-82afb3bf298a.sql (5.32 KB)
- 20251015114240_8c1d99bb-3d57-48c4-a141-7227fa98fa99.sql (1.02 KB)
- 20251015190601_d4336f1a-f32f-40a3-80e9-bfd114539395.sql (1.31 KB)
- 20251015220315_f040a241-0131-4e61-aac8-b710045bd804.sql (4.78 KB)
- 20251015225630_efd262ba-e6b4-4d19-8abc-7381e08fa434.sql (201 Bytes)
- 20251015232744_feafd27b-8598-41d2-8b6f-1f1f822c7dbf.sql (198 Bytes)
- 20251015235250_ca1f7471-bd0e-486c-8028-f4ab2a48d3da.sql (595 Bytes)
- 20251016003832_654e1ed9-f0cd-4ab8-abf4-ca031d6c5d00.sql (6.25 KB)
- 20251016011636_49ee531b-6514-4d42-a5f5-8379e02c1dd0.sql (1.5 KB)
- 20251016012005_815f9ef7-8056-4f77-ae46-81536a7f67a7.sql (824 Bytes)
- 20251016012842_f82fa0a4-4e9b-4369-a643-0fdb099f75b4.sql (1.2 KB)
- 20251016021925_755b3815-871b-41d5-9fd3-964e48d67938.sql (824 Bytes)
- 20251016024703_8c227551-2801-4b2d-bf57-418a2a1bf651.sql (1.84 KB)
- 20251016025109_0aa6f750-4979-49d1-a85e-709e3c809008.sql (816 Bytes)
- 20251016025221_ec145121-95e8-48e2-aa2f-e1ba2ea8305e.sql (813 Bytes)
- 20251016025547_d059eb98-e069-4284-b82a-a92fc402950b.sql (594 Bytes)
- 20251016025600_dad4d1b9-a413-4556-85b6-7b2f61487e8e.sql (419 Bytes)
- 20251016101919_1c5871cf-b829-4d25-918c-3c9ecf16cb16.sql (363 Bytes)
- 20251016230644_5474ffbe-e505-4c04-b57a-7c52176a545a.sql (617 Bytes)
- 20251016234735_16d8c9cd-a43a-41e6-88f7-7831e86af5bd.sql (2.09 KB)
- 20251016235412_bb8fb180-6e98-49af-9a28-bc987d033dd9.sql (226 Bytes)
- 20251017002956_b8db3ef4-9301-4158-bace-609f8958f638.sql (3.29 KB)
- 20251017004101_a571a028-5d0a-4f1f-b307-1ae6bae1bf91.sql (2.71 KB)
- 20251017004328_5a1430df-6256-4b1e-9152-ad9cb275bc0d.sql (383 Bytes)
- 20251017005744_ffb4c716-6fd6-4afd-81ad-390f78246f72.sql (540 Bytes)
- 20251017154800_091c0718-5b67-49b5-9034-606c85e1962e.sql (502 Bytes)
- 20251019003226_127c5fe8-605f-48c5-813c-ff7ccead2dc8.sql (2.51 KB)
- 20251019215706_2118738a-fa6c-4826-adec-4cf97aab42f9.sql (1.55 KB)
- 20251024110435_add_connection_status_to_locations.sql (1.09 KB)
- 20251025000000_drop_old_bork_credentials.sql (685 Bytes)
- 20251027000000_create_powerbi_pnl_aggregated_data.sql (2.55 KB)
- 20251102142758_expand_eitje_aggregated_tables.sql (4.65 KB)
- 20251102150000_expand_eitje_revenue_aggregated.sql (2.25 KB)
- 20251103003212_add_roadmap_status_fields.sql (478 Bytes)
- 20251103010000_add_inbox_status.sql (657 Bytes)
- 20251103020000_add_roadmap_branch_name.sql (411 Bytes)
- 20251104000000_add_done_status_to_roadmap.sql (264 Bytes)

## Restore Instructions

### Restore Edge Functions

```bash
# Copy functions back to your project
cp -r functions/* /path/to/project/supabase/functions/
```

### Restore Migrations

```bash
# Copy migrations back to your project
cp migrations/*.sql /path/to/project/supabase/migrations/
```

### Restore Database Schema

If you have a schema.sql file:

```bash
# Restore schema (requires Supabase CLI)
supabase db reset
psql -h <host> -U <user> -d <database> < schema.sql
```

### Apply Migrations

```bash
# Apply all migrations
supabase migration up
```

## Notes

- This export was created on 2025-11-05T01:13:12.347Z
- Edge functions may require environment variables/secrets to be configured in Supabase Dashboard
- Database migrations should be applied in order (they are sorted by timestamp)
- Always test in a development environment before applying to production
