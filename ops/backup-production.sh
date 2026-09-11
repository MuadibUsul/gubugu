#!/bin/sh
set -eu

backup_dir="${1:-}"
case "$backup_dir" in
  /*) ;;
  *) echo "usage: $0 /absolute/backup/directory" >&2; exit 2 ;;
esac

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"

docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$backup_dir/postgres-$stamp.dump"

for volume in catalog_assets user_scan_assets community_images; do
  docker run --rm \
    -v "gubugu_${volume}:/source:ro" \
    -v "$backup_dir:/backup" \
    alpine:3.22 tar -C /source -czf "/backup/${volume}-$stamp.tar.gz" .
done

find "$backup_dir" -type f -mtime +30 -delete
echo "backup complete: $stamp"
