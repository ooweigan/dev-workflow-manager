#!/usr/bin/env python3
"""Read-only format validation for Dev Workflow Manager commit protocol v1."""
import argparse
import re
import sys
from pathlib import Path

TYPES = 'feat|fix|perf|refactor|file|style|docs|test|chore|build|ci|revert'
FIELDS = ['Description', 'Page-Path', 'Platforms', 'Issue', 'Verification']


def validate(message):
    errors = []
    lines = message.splitlines()
    while lines and not lines[-1].strip():
        lines.pop()
    if not lines:
        return ['消息为空']
    title = re.fullmatch(rf'({TYPES})\(([a-z0-9][a-z0-9._/-]*)\)(!)?: (\S.*)', lines[0])
    if not title:
        errors.append('标题须为 type(scope): summary，type 和 scope 须符合协议')
    elif title[4] != title[4].strip() or title[4].endswith(('.', '。')) or ';' in title[4]:
        errors.append('summary 不得有首尾空白、ASCII 分号或结尾句号')
    meta = re.fullmatch(r'AUTHOR:([^;\r\n]+);XQBH:([^;\s]+);NOTES:([^;\r\n]+)', lines[-1])
    if not meta:
        errors.append('最后一行须为 AUTHOR:<作者>;XQBH:<编号或NONE>;NOTES:<summary>')
    else:
        if meta[1] != meta[1].strip() or meta[3] != meta[3].strip():
            errors.append('元数据值不能有首尾空白')
        if any(not part for part in meta[2].split(',')):
            errors.append('XQBH 编号列表存在空项')
        if title and meta[3] != title[4]:
            errors.append('NOTES 必须与标题 summary 完全相同')
    expected = FIELDS + (['BREAKING CHANGE'] if title and title[3] else [])
    pos = 1
    for field in expected:
        if pos >= len(lines) or lines[pos] != '':
            errors.append(f'{field} 前须有一个空行')
            break
        pos += 1
        if pos >= len(lines) or lines[pos] != field + ':':
            errors.append(f'缺少或顺序错误的字段：{field}:')
            break
        pos += 1
        count = 0
        while pos < len(lines) and lines[pos] != '':
            if not re.fullmatch(r'- \S.*', lines[pos]):
                errors.append(f'{field} 内容须为非空的 - 列表项')
            count += 1
            pos += 1
        if count == 0:
            errors.append(f'{field} 不能为空')
    else:
        if pos != len(lines) - 2 or lines[pos] != '':
            errors.append('区块后只能保留一个空行和最后一行元数据')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('message_file', type=Path)
    args = parser.parse_args()
    try:
        errors = validate(args.message_file.read_text(encoding='utf-8'))
    except (OSError, UnicodeError) as exc:
        print(f'无法读取消息：{exc}', file=sys.stderr)
        return 2
    if errors:
        for error in errors:
            print(f'ERROR: {error}', file=sys.stderr)
        return 1
    print('格式通过；仍须核实 diff、作者、关联任务、路径和验证证据。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
