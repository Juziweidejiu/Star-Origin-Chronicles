import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface ArtImageProps {
  /** 候选路径，按顺序尝试；全部失败时渲染 fallback */
  sources: string[];
  alt: string;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}

/** 已确认不存在的路径：避免每次挂载都重新请求一轮 404 */
const missingSources = new Set<string>();

/**
 * 带回落链的图片：路径不存在时自动尝试下一张，全部失败则渲染 fallback。
 * 用于「图还没画、但界面先能跑」的场景，见 docs/ART_ASSETS.md。
 */
export function ArtImage({ sources, alt, className, style, fallback }: ArtImageProps) {
  const [index, setIndex] = useState(() => {
    const found = sources.findIndex(src => !missingSources.has(src));
    return found === -1 ? sources.length : found;
  });

  if (index >= sources.length) return <>{fallback ?? null}</>;

  return (
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      style={style}
      draggable={false}
      onError={() => {
        missingSources.add(sources[index]);
        setIndex(i => i + 1);
      }}
    />
  );
}
