"use client";
import type { WorkspaceController } from "../../../shell/useWorkspaceController";
import { optimizedGraphCategories, projectGraphPoint } from "../domain/graph";
import { KNOWLEDGE_TAXONOMY } from "../domain/taxonomy";
import { getKnowledgeSphereLabel } from "../domain/textbook";
type Props = {
    controller: Pick<WorkspaceController, "graphViewport" | "semanticGraph" | "graphFocus" | "graphPanning" | "handleGraphWheel" | "startGraphPan" | "moveGraphPan" | "endGraphPan" | "setGraphViewport" | "zoomGraph" | "activeCategory" | "setGraphFocus" | "setActiveCategory" | "categoryCounts" | "setSelectedKnowledge" | "setToast" | "secondaryGroups" | "setLibraryQuery">;
};
export function KnowledgeGraph({ controller }: Props) {
    const { graphViewport, semanticGraph, graphFocus, graphPanning, handleGraphWheel, startGraphPan, moveGraphPan, endGraphPan, setGraphViewport, zoomGraph, activeCategory, setGraphFocus, setActiveCategory, categoryCounts, setSelectedKnowledge, setToast, secondaryGroups, setLibraryQuery } = controller;
    const categories3d = optimizedGraphCategories.map((node) => ({
        ...node,
        projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    const topics3d = semanticGraph.topics.map((node) => ({
        ...node,
        projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    const articles3d = semanticGraph.articles.map((node) => ({
        ...node,
        projected: projectGraphPoint(node, graphViewport.y, graphViewport.x),
    }));
    type ProjectedPoint = {
        left: number;
        top: number;
        depth: number;
        scale: number;
        zIndex: number;
    };
    const curvePath = (from: ProjectedPoint, to: ProjectedPoint, bend = 0) => {
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const normalX = -dy / distance;
        const normalY = dx / distance;
        const midX = (from.left + to.left) / 2 + normalX * bend;
        const midY = (from.top + to.top) / 2 + normalY * bend;
        return `M ${from.left.toFixed(3)} ${from.top.toFixed(3)} Q ${midX.toFixed(3)} ${midY.toFixed(3)} ${to.left.toFixed(3)} ${to.top.toFixed(3)}`;
    };
    const edgeClass = (kind: string, fromId: string, toId: string) => {
        if (!graphFocus)
            return `graph-edge ${kind}`;
        return `graph-edge ${kind} ${graphFocus === fromId || graphFocus === toId ? "is-active" : "is-muted"}`;
    };
    const anchorForArticle = (anchorId: string) => {
        const topic = topics3d.find((node) => node.id === anchorId);
        if (topic)
            return { projected: topic.projected, focusId: `topic:${topic.id}` };
        const category = categories3d.find((node) => node.name === anchorId);
        return category
            ? {
                projected: category.projected,
                focusId: `category:${category.name}`,
            }
            : null;
    };
    return (<section className="knowledge-visual panel graph-3d-shell">
        <div className="visual-head">
          <div>
            <span>3D SEMANTIC KNOWLEDGE GRAPH</span>
            <h3>三维知识关联球</h3>
            <p>
              系统按知识内容自动整合、均匀排布并建立分类、主题和知识条目之间的关联。
            </p>
          </div>
          <div className="visual-legend graph-legend">
            <i />
            大球 · 一级领域 <i />
            中球 · 关联主题 <i />
            小球 · 知识条目
          </div>
        </div>
        <div className={`map-stage graph-3d-stage ${graphPanning ? "is-panning" : ""}`} aria-label="可旋转缩放的三维知识关联图谱" onWheel={handleGraphWheel} onPointerDown={startGraphPan} onPointerMove={moveGraphPan} onPointerUp={endGraphPan} onPointerCancel={endGraphPan} onDoubleClick={(event) => {
            if (!(event.target as HTMLElement).closest("button"))
                setGraphViewport({ x: 0, y: 0, scale: 1 });
        }}>
          <div className="graph-controls" aria-label="图谱缩放控制">
            <button onClick={() => zoomGraph(-0.16)} aria-label="缩小知识图谱">
              −
            </button>
            <span>{Math.round(graphViewport.scale * 100)}%</span>
            <button onClick={() => zoomGraph(0.16)} aria-label="放大知识图谱">
              ＋
            </button>
            <button className="graph-reset" onClick={() => setGraphViewport({ x: 0, y: 0, scale: 1 })} aria-label="复位知识图谱">
              ⌖
            </button>
          </div>
          <div className="graph-axis">
            <span>X</span>
            <span>Y</span>
            <span>Z</span>
          </div>
          <div className="map-canvas graph-3d-canvas" style={{ transform: `scale(${graphViewport.scale})` }}>
            <span className="depth-orbit orbit-a"/>
            <span className="depth-orbit orbit-b"/>
            <span className="depth-orbit orbit-c"/>
            {Array.from({ length: 14 }, (_, index) => (<i className="map-particle" key={`particle-${index}`} style={{ "--particle-index": index } as React.CSSProperties}/>))}
            <svg className="graph-connection-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {topics3d.flatMap((topic, topicIndex) => topic.categories.map((categoryName, categoryIndex) => {
            const category = categories3d.find((node) => node.name === categoryName);
            if (!category)
                return null;
            const bend = ((topicIndex + categoryIndex) % 2 ? 1 : -1) *
                (1.2 + categoryIndex * 0.45);
            return (<path key={`${topic.id}-${categoryName}`} d={curvePath(topic.projected, category.projected, bend)} className={edgeClass("graph-edge-domain", `topic:${topic.id}`, `category:${categoryName}`)} style={{ "--edge-color": topic.color } as React.CSSProperties}/>);
        }))}
              {articles3d.map((article, index) => {
            const anchor = anchorForArticle(article.anchorId);
            if (!anchor)
                return null;
            const color = KNOWLEDGE_TAXONOMY.find((meta) => meta.name === article.item.primaryCategory)?.color || "#d5b168";
            return (<path key={`article-link-${article.item.id}`} d={curvePath(anchor.projected, article.projected, (index % 2 ? 1 : -1) * 0.65)} className={edgeClass("graph-edge-article", anchor.focusId, `article:${article.item.id}`)} style={{ "--edge-color": color } as React.CSSProperties}/>);
        })}
              {semanticGraph.topicEdges.map((edge, index) => {
            const from = topics3d.find((topic) => topic.id === edge.fromId);
            const to = topics3d.find((topic) => topic.id === edge.toId);
            return from && to ? (<path key={`topic-relation-${edge.fromId}-${edge.toId}`} d={curvePath(from.projected, to.projected, (index % 2 ? 1 : -1) * 1.1)} className={edgeClass("graph-edge-topic", `topic:${edge.fromId}`, `topic:${edge.toId}`)}/>) : null;
        })}
              {semanticGraph.relationEdges.slice(0, 10).map((edge, index) => {
            const from = articles3d.find((article) => article.item.id === edge.fromId);
            const to = articles3d.find((article) => article.item.id === edge.toId);
            return from && to ? (<path key={`relation-${edge.fromId}-${edge.toId}`} d={curvePath(from.projected, to.projected, (index % 2 ? 1 : -1) * 1.8)} className={edgeClass("graph-edge-relation", `article:${edge.fromId}`, `article:${edge.toId}`)}/>) : null;
        })}
            </svg>

            {categories3d.map((node) => {
            const meta = KNOWLEDGE_TAXONOMY.find((item) => item.name === node.name)!;
            return (<button key={node.name} className={`map-node graph-category sphere-large ${activeCategory === node.name ? "selected" : ""}`} style={{
                    left: `${node.projected.left}%`,
                    top: `${node.projected.top}%`,
                    zIndex: 500 + node.projected.zIndex,
                    "--node-color": meta.color,
                    "--depth-scale": node.projected.scale,
                } as React.CSSProperties} onMouseEnter={() => setGraphFocus(`category:${node.name}`)} onMouseLeave={() => setGraphFocus(null)} onFocus={() => setGraphFocus(`category:${node.name}`)} onBlur={() => setGraphFocus(null)} onClick={() => setActiveCategory(node.name)}>
                  <span>{meta.icon}</span>
                  <b>{node.displayName || node.name}</b>
                  <small>{categoryCounts[node.name] || 0} 条</small>
                </button>);
        })}
            {topics3d.map((topic) => (<button key={topic.id} className="semantic-sphere sphere-medium" style={{
                left: `${topic.projected.left}%`,
                top: `${topic.projected.top}%`,
                zIndex: 600 + topic.projected.zIndex,
                "--node-color": topic.color,
                "--depth-scale": topic.projected.scale,
            } as React.CSSProperties} title={`${topic.name}连接${topic.categories.map((name) => (name === "车辆" ? "汽车" : name)).join("、")}`} onMouseEnter={() => setGraphFocus(`topic:${topic.id}`)} onMouseLeave={() => setGraphFocus(null)} onFocus={() => setGraphFocus(`topic:${topic.id}`)} onBlur={() => setGraphFocus(null)} onClick={() => {
                const matched = topic.items[0];
                if (matched) {
                    setActiveCategory(matched.primaryCategory);
                    setSelectedKnowledge(matched);
                }
                else
                    setToast(`${topic.name}已连接${topic.categories.map((name) => (name === "车辆" ? "汽车" : name)).join("、")}，等待收录相关知识`);
            }}>
                <span>◎</span>
                <b>{topic.name}</b>
                <small>{topic.items.length || "关联"}</small>
              </button>))}
            {articles3d.map((article) => {
            const color = KNOWLEDGE_TAXONOMY.find((meta) => meta.name === article.item.primaryCategory)?.color || "#d5b168";
            return (<button key={article.item.id} className="article-sphere sphere-small" style={{
                    left: `${article.projected.left}%`,
                    top: `${article.projected.top}%`,
                    zIndex: 700 + article.projected.zIndex,
                    "--node-color": color,
                    "--depth-scale": article.projected.scale,
                } as React.CSSProperties} title={article.item.title} onMouseEnter={() => setGraphFocus(`article:${article.item.id}`)} onMouseLeave={() => setGraphFocus(null)} onFocus={() => setGraphFocus(`article:${article.item.id}`)} onBlur={() => setGraphFocus(null)} onClick={() => {
                    setActiveCategory(article.item.primaryCategory);
                    setSelectedKnowledge(article.item);
                }}>
                  <b>{getKnowledgeSphereLabel(article.item)}</b>
                  <small>{article.item.title}</small>
                </button>);
        })}
          </div>
          <div className="graph-hint">
            <span>✥ 拖动旋转3D视角</span>
            <span>滚轮 / 按钮缩放</span>
            <span>双击复位</span>
          </div>
        </div>
        <div className="topic-stream">
          <span className="topic-label">
            {activeCategory === "全部"
            ? "全部二级目录"
            : `${activeCategory === "车辆" ? "汽车" : activeCategory} · 二级目录`}
          </span>
          <div>
            {secondaryGroups.length ? (secondaryGroups.map(([name, count]) => (<button key={name} onClick={() => setLibraryQuery(name)}>
                  <span>{name}</span>
                  <em>{count}</em>
                </button>))) : (<small>该领域还没有知识条目</small>)}
          </div>
        </div>
      </section>);
}
