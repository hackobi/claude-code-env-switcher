import { NextResponse } from 'next/server';
import path from 'path';
import Database from 'better-sqlite3';
import { applyLogoOverlay } from '../../lib/image-overlay';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'marketing.db');

interface ContentRow {
  base_image_path: string | null;
  image_path: string | null;
}

function getBaseImageFromDatabase(id: string): string | null {
  try {
    const db = new Database(DB_PATH);
    const stmt = db.prepare('SELECT base_image_path, image_path FROM generated_content WHERE id = ?');
    const row = stmt.get(parseInt(id)) as ContentRow | undefined;
    db.close();
    // Return base image if available, otherwise fall back to current image
    return row?.base_image_path || row?.image_path || null;
  } catch (error) {
    console.error('Failed to get base image from database:', error);
    return null;
  }
}

function updateImageInDatabase(id: string, imageUrl: string): boolean {
  try {
    const db = new Database(DB_PATH);
    const stmt = db.prepare('UPDATE generated_content SET image_path = ? WHERE id = ?');
    const result = stmt.run(imageUrl, parseInt(id));
    db.close();
    return result.changes > 0;
  } catch (error) {
    console.error('Failed to update image in database:', error);
    return false;
  }
}

/**
 * Regenerate the overlay on an existing image with a custom tagline
 * This uses the stored base image (without overlay) and applies a fresh overlay
 * with the new tagline, ensuring clean text without layering
 */
export async function POST(request: Request) {
  try {
    const { id, imageUrl, tagline } = await request.json();

    // Determine which image to use as the base
    let baseImageUrl = imageUrl;

    // If we have an ID, try to get the clean base image from the database
    if (id) {
      const storedBaseImage = getBaseImageFromDatabase(id);
      if (storedBaseImage) {
        console.log('[RegenerateOverlay] Using stored base image from database');
        baseImageUrl = storedBaseImage;
      } else {
        console.log('[RegenerateOverlay] No base image stored, using provided image (may have existing overlay)');
      }
    }

    if (!baseImageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided and no base image found in database' },
        { status: 400 }
      );
    }

    console.log('[RegenerateOverlay] Applying overlay with tagline:', tagline);

    // Apply new overlay with custom tagline on the clean base image
    const newImageUrl = await applyLogoOverlay(baseImageUrl, { tagline: tagline || '' });

    // Update database if ID provided (only update image_path, not base_image_path)
    if (id) {
      const updated = updateImageInDatabase(id, newImageUrl);
      if (updated) {
        console.log(`Updated image for content ID ${id}`);
      }
    }

    return NextResponse.json({
      success: true,
      imageUrl: newImageUrl,
      tagline,
    });
  } catch (error) {
    console.error('Failed to regenerate overlay:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate overlay' },
      { status: 500 }
    );
  }
}
