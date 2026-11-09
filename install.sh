#!/bin/sh
set -eu

ref=main
scope=
force=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --global|--project)
      if [ -n "$scope" ]; then echo '只能选择一个安装范围' >&2; exit 1; fi
      scope=$1; shift ;;
    --force) force=--force; shift ;;
    --ref)
      if [ "$#" -lt 2 ]; then echo '--ref 需要版本或提交号' >&2; exit 1; fi
      ref=$2; shift 2 ;;
    --help|-h)
      echo '用法：sh install.sh --global|--project [--force] [--ref main|版本|完整提交号]'
      echo '需要 Node.js 20+、curl 和 tar；默认不覆盖，--force 先保留备份。'
      exit 0 ;;
    *) echo "未知参数：$1" >&2; exit 1 ;;
  esac
done
if [ -z "$scope" ]; then echo '请指定 --global 或 --project' >&2; exit 1; fi
case "$ref" in ''|*[!A-Za-z0-9._-]*) echo 'ref 仅支持字母、数字、点、下划线和连字符' >&2; exit 1 ;; esac
for dependency in node curl tar; do
  command -v "$dependency" >/dev/null 2>&1 || { echo "缺少依赖：$dependency" >&2; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 20) { console.error("需要 Node.js 20+"); process.exit(1) }'
stage=$(mktemp -d "${TMPDIR:-/tmp}/dev-workflow-download.XXXXXX")
trap 'rm -rf "$stage"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
  "https://codeload.github.com/ooweigan/dev-workflow-manager/tar.gz/$ref" \
  --output "$stage/source.tar.gz"
mkdir "$stage/source"
tar -xzf "$stage/source.tar.gz" -C "$stage/source" --strip-components=1
if [ ! -f "$stage/source/bin/cli.mjs" ] || [ ! -f "$stage/source/skills/dev-workflow-manager/SKILL.md" ]; then
  echo '下载的仓库缺少安装文件，未安装' >&2; exit 1
fi
if [ -n "$force" ]; then
  node "$stage/source/bin/cli.mjs" install "$scope" "$force"
else
  node "$stage/source/bin/cli.mjs" install "$scope"
fi
