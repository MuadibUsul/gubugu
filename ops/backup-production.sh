#!/bin/sh
set -eu
umask 077

backup_dir="${1:-}"
case "$backup_dir" in
  /) echo "refusing to use / as backup directory" >&2; exit 2 ;;
  /*) ;;
  *) echo "usage: $0 /absolute/backup/directory" >&2; exit 2 ;;
esac

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

# 防止 cron 重叠；锁和临时文件都留在专用备份目录内。
exec 9>"$backup_dir/.gubugu-backup.lock"
if ! flock -n 9; then
  echo "another gubugu backup is already running" >&2
  exit 1
fi

cleanup() {
  [ -z "${postgres_tmp:-}" ] || rm -f "$postgres_tmp"
  [ -z "${archive_tmp:-}" ] || rm -f "$archive_tmp"
}
trap cleanup EXIT HUP INT TERM

postgres_file="$backup_dir/postgres-$stamp.dump"
postgres_tmp="$backup_dir/.postgres-$stamp.dump.tmp.$$"
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$postgres_tmp"
test -s "$postgres_tmp"
docker compose exec -T postgres sh -c \
  'pg_restore -l >/dev/null' < "$postgres_tmp"
mv "$postgres_tmp" "$postgres_file"

for volume in catalog_assets user_scan_assets community_images; do
  archive="$backup_dir/${volume}-$stamp.tar.gz"
  archive_tmp="$backup_dir/.${volume}-$stamp.tar.gz.tmp.$$"
  docker run --rm \
    -v "gubugu_${volume}:/source:ro" \
    -v "$backup_dir:/backup" \
    alpine:3.22 tar -C /source -czf "/backup/$(basename "$archive_tmp")" .
  tar -tzf "$archive_tmp" >/dev/null
  mv "$archive_tmp" "$archive"
done

find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'postgres-*.dump' -o -name 'catalog_assets-*.tar.gz' \
     -o -name 'user_scan_assets-*.tar.gz' -o -name 'community_images-*.tar.gz' \) \
  -mtime +30 -delete
echo "backup complete: $stamp"
