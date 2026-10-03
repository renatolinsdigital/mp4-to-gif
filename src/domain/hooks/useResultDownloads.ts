import { useState } from 'react';

import { archiveFileName } from '@/domain/helpers/fileNaming';
import { createZipArchive } from '@/domain/services/archive.service';
import type { GifResult } from '@/domain/types/queue';
import { downloadBlob, downloadUrl } from '@/shared/helpers/downloadFile';
import { useToast } from '@/shared/hooks/useToast';

/** Single GIFs download directly; several are packaged into one ZIP archive. */
export function useResultDownloads() {
  const toast = useToast();
  const [isPackaging, setIsPackaging] = useState(false);

  const downloadOne = (result: GifResult) => downloadUrl(result.url, result.fileName);

  const downloadAll = async (results: GifResult[]) => {
    const [first] = results;
    if (!first) return;
    if (results.length === 1) {
      downloadOne(first);
      return;
    }

    setIsPackaging(true);
    try {
      const archive = await createZipArchive(
        results.map((result) => ({ name: result.fileName, blob: result.blob })),
      );
      downloadBlob(archive, archiveFileName(new Date()));
    } catch (error) {
      console.error('Failed to build the ZIP archive', error);
      toast.show('error', "Couldn't build the ZIP archive. Try downloading GIFs one at a time.");
    } finally {
      setIsPackaging(false);
    }
  };

  return { downloadOne, downloadAll, isPackaging };
}
