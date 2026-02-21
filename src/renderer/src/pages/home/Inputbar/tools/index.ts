// Tool registry loader
// Import all tool definitions to register them
// AIIRC: 只保留上传文件功能，其他工具全部移除
import './attachmentTool'
// import './mentionModelsTool'
// import './newTopicTool'
// import './quickPhrasesTool'
// import './thinkingTool'
// import './webSearchTool'
// import './urlContextTool'
// import './knowledgeBaseTool'
// import './mcpToolsTool'
// import './generateImageTool'
// import './clearTopicTool'
// import './toggleExpandTool'
// import './newContextTool'
// Agent Session tools
// import './createSessionTool'
// import './slashCommandsTool'
// import './resourceTool'

// Export registry functions
export { getAllTools, getTool, getToolsForScope, registerTool } from '../types'
