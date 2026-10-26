import type { SourceAvailability } from '../../contracts/runtime';
export function SourceNotice({ availability }: { availability?: SourceAvailability }) {
    return availability && availability.state !== 'fresh' ? <p className="round2-hint" role="status">{availability.message}{availability.savedAt ? ` 保存时间：${new Date(availability.savedAt).toLocaleString('zh-CN')}` : ''}</p> : null;
}
