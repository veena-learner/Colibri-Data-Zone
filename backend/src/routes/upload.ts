import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { assetModel } from '../models/AssetModel';
import { authMiddleware, AuthRequest, isStewardOrAbove } from '../middleware/auth';
import { ASSET_TYPES, SENSITIVITY_LEVELS } from '../config/constants';
import type { AssetType, SensitivityLevel } from '../config/constants';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

interface ExcelRow {
  name: string;
  description: string;
  type: string;
  source?: string;
  location: string;
  domainId: string;
  dataOwnerId?: string;
  dataStewardId?: string;
  sensitivity?: string;
  format?: string;
  tags?: string;
}

router.post(
  '/assets',
  isStewardOrAbove,
  upload.single('file'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        res.status(400).json({ success: false, error: 'Excel file is empty' });
        return;
      }

      const results = {
        success: [] as string[],
        errors: [] as { row: number; name: string; error: string }[],
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // Excel row number (1-indexed + header)

        try {
          // Validate required fields
          if (!row.name || !row.description || !row.type || !row.location || !row.domainId) {
            results.errors.push({
              row: rowNum,
              name: row.name || 'Unknown',
              error: 'Missing required fields (name, description, type, location, domainId)',
            });
            continue;
          }

          // Validate asset type
          const assetType = row.type as AssetType;
          if (!Object.values(ASSET_TYPES).includes(assetType)) {
            results.errors.push({
              row: rowNum,
              name: row.name,
              error: `Invalid type "${row.type}". Must be one of: ${Object.values(ASSET_TYPES).join(', ')}`,
            });
            continue;
          }

          // Validate sensitivity
          const sensitivity = (row.sensitivity || 'Internal') as SensitivityLevel;
          if (!Object.values(SENSITIVITY_LEVELS).includes(sensitivity)) {
            results.errors.push({
              row: rowNum,
              name: row.name,
              error: `Invalid sensitivity "${row.sensitivity}". Must be one of: ${Object.values(SENSITIVITY_LEVELS).join(', ')}`,
            });
            continue;
          }

          // Parse tags
          const tags = row.tags
            ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : [];

          // Create asset
          const asset = await assetModel.create({
            name: row.name,
            description: row.description,
            type: assetType,
            source: row.source,
            location: row.location,
            format: row.format,
            domainId: row.domainId,
            dataOwnerId: row.dataOwnerId || req.user!.userId,
            dataStewardId: row.dataStewardId,
            sensitivity,
            tags,
          });

          results.success.push(asset.name);
        } catch (err: any) {
          results.errors.push({
            row: rowNum,
            name: row.name || 'Unknown',
            error: err.message || 'Unknown error',
          });
        }
      }

      res.json({
        success: true,
        data: {
          totalRows: rows.length,
          successCount: results.success.length,
          errorCount: results.errors.length,
          createdAssets: results.success,
          errors: results.errors,
        },
      });
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process Excel file',
      });
    }
  }
);

router.get('/template', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        name: 'Example Asset',
        description: 'Description of the data asset',
        type: 'S3',
        source: 'Fivetran',
        location: 's3://bucket/path/',
        domainId: 'domain-1',
        dataOwnerId: 'user-dataowner-1',
        dataStewardId: 'user-steward-1',
        sensitivity: 'Internal',
        format: 'Parquet',
        tags: 'tag1, tag2',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=asset_upload_template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate template' });
  }
});

export default router;
