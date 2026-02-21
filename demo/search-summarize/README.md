# Demo: Search & Summarize

这是 ICEE 的参考示例 Graph，展示完整的四节点链路：

```
InputNode → SearchToolNode → SummarizeLLMNode → OutputNode
```

## 运行方式

```bash
# 使用 CLI 运行 (需要先 build CLI)
icee run graph.json --input '{"query": "AI agent frameworks 2025"}'

# 查看运行历史
icee list

# 回放某次运行
icee replay <runId>
```

## 节点说明

| 节点 | 类型 | 说明 |
|------|------|------|
| input | INPUT | 接收全局输入，将 query 字段传给下一节点 |
| search | TOOL | 调用 web_search 工具，支持 3 次指数退避重试 |
| summarize | LLM | gpt-4o-mini 总结搜索结果，temperature=0.3 确保稳定性 |
| output | OUTPUT | 将总结结果作为 Run 最终输出 |

## Trace Replay

每次运行都会完整记录 StepEvent，包含：
- 渲染后的最终 Prompt (`renderedPrompt`)
- Provider 元数据 (model, temperature, top_p)
- Token 消耗和成本

可通过 `icee replay <runId>` 完整回放。
