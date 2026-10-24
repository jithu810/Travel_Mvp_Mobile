"""Prepare local files and a review plan. Never connects to Supabase or changes rows."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil

from PIL import Image, ImageOps

UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
PATH = re.compile(rf"journey-media/({UUID})/({UUID})/(cover|stops/({UUID}))/({UUID})\.(jpg|png|webp)$")
MAX_BYTES = 15 * 1024 * 1024


def digest(path):
    with path.open('rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()


def prepare(manifest_path, output):
    manifest_path = manifest_path.resolve(strict=True)
    root = manifest_path.parent
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    project = manifest.get('projectRef')
    items = manifest.get('items')
    if not isinstance(project, str) or not re.fullmatch(r'[a-z0-9]{20}', project):
        raise ValueError('A confirmed projectRef is required; no connection will be made.')
    if not isinstance(items, list) or not 0 < len(items) <= 1000:
        raise ValueError('Provide 1 to 1000 explicitly approved local source items.')
    if output.exists():
        raise ValueError('Output already exists. Choose a new directory; nothing is overwritten.')
    checked, seen, destinations = [], set(), set()
    for item in items:
        original = item.get('storagePath', '') if isinstance(item, dict) else ''
        match = PATH.fullmatch(original) if isinstance(original, str) else None
        if not match or original in seen:
            raise ValueError('Each item requires a unique canonical legacy journey-media path.')
        seen.add(original)
        relative = item.get('source')
        if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
            raise ValueError('Source must be a local path relative to the approved manifest.')
        source = (root / relative).resolve(strict=True)
        if not source.is_relative_to(root) or not source.is_file():
            raise ValueError('Source must remain inside the approved manifest directory.')
        if not 0 < source.stat().st_size <= MAX_BYTES:
            raise ValueError('Source must be between 1 byte and 15 MiB.')
        with Image.open(source) as image:
            width, height = image.size
            expected = {'jpg': 'JPEG', 'png': 'PNG', 'webp': 'WEBP'}[match.group(6)]
            if image.format != expected or width * height > 50_000_000 or max(width, height) > 12000:
                raise ValueError('Source encoding/dimensions do not match the approved original.')
            image.verify()
        base, ext = original.rsplit('.', 1)
        full_path, thumb_path = base + '.full-v1.' + ext, base + '.thumb-512-v1.jpg'
        if full_path in destinations or thumb_path in destinations:
            raise ValueError('Planned immutable destinations collide. Review the source mapping.')
        destinations.update((full_path, thumb_path))
        checked.append((original, source, full_path, thumb_path, ext))
    output.mkdir(parents=True, exist_ok=False)
    rows = []
    for index, (original, source, full_path, thumb_path, ext) in enumerate(checked):
        full_file = output / f'{index:04d}-full.{ext}'
        thumb_file = output / f'{index:04d}-thumb.jpg'
        source_hash = digest(source)
        with source.open('rb') as incoming, full_file.open('xb') as outgoing:
            shutil.copyfileobj(incoming, outgoing)
        if digest(full_file) != source_hash or digest(source) != source_hash:
            raise ValueError('Source changed during preparation. Discard this unapproved plan.')
        with Image.open(full_file) as image:
            oriented = ImageOps.exif_transpose(image)
            oriented.thumbnail((512, 512), Image.Resampling.LANCZOS)
            rgb = oriented.convert('RGB')
            rgb.save(thumb_file, format='JPEG', quality=70)
            dimensions = list(rgb.size)
        if thumb_file.stat().st_size > 1024 * 1024:
            raise ValueError('Thumbnail exceeds the 1 MiB limit.')
        rows.append({
            'currentReference': original, 'expectedSourceSha256': source_hash,
            'canonicalOriginal': full_path, 'thumbnail': thumb_path,
            'localOriginal': full_file.name, 'localThumbnail': thumb_file.name,
            'originalBytes': full_file.stat().st_size, 'thumbnailBytes': thumb_file.stat().st_size,
            'thumbnailDimensions': dimensions, 'thumbnailSha256': digest(thumb_file),
            'activation': 'REVIEW REQUIRED: verify current owner/reference/version, create both objects, then approve an optimistic reference update; retain old original.',
        })
    plan = {'projectRef': project, 'executionAuthorized': False, 'mode': 'local-review-only',
            'policyRequired': 'docs/backend/image-thumbnails.review.sql',
            'requirements': ['Verify live target and approved manifest hash.',
                             'Recheck source hashes, ownership, current references and updated_at.',
                             'Abort on destination collisions; create-only uploads, no overwrites.',
                             'Verify both objects before separately approved reference changes.',
                             'Retain originals and record receipts for rollback; no automatic deletion.'],
            'items': rows}
    with (output / 'review-plan.json').open('x', encoding='utf-8') as handle:
        json.dump(plan, handle, indent=2)
        handle.write('\n')
    return len(rows)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True, help='Approved local manifest JSON')
    parser.add_argument('--output', type=Path, required=True, help='New local review directory')
    args = parser.parse_args()
    try:
        count = prepare(args.input, args.output)
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'Preparation stopped: {error}\n')
    print(f'Prepared {count} local image pairs for review. No network calls or live changes.')
