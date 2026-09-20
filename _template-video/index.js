'use strict';

/**
 * 视频插件驱动（JS 纯函数微内核）
 *
 * 只需实现以下方法，无需手写繁琐的 ui.schema.json 与 provider.json：
 * 1. buildSubmit(ctx): 构造上游创建任务的 HTTP 请求参数
 * 2. parseSubmitResponse(data, ctx) [可选]: 提取任务 ID（默认自动取 data.id / data.task_id）
 * 3. buildQuery(taskId, ctx): 构造轮询状态的 HTTP 请求参数
 * 4. parseTaskResult(data, ctx): 归一化解析任务状态 (queued/processing/completed/failed) 与产物地址
 */

module.exports = {
  /**
   * 构造创建任务请求
   * @param {object} ctx
   *   - ctx.baseUrl: 上游基础 URL
   *   - ctx.apiKey: 用户配置的 API Key
   *   - ctx.model: 当前选中的模型 ID
   *   - ctx.fields: 用户填写的表单字段（prompt, aspectRatio, seconds, mode 等）
   *   - ctx.media: 参考素材（images: string[] 等）
   */
  buildSubmit(ctx) {
    return {
      url: `${ctx.baseUrl}/v1/videos/generations`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: ctx.model,
        prompt: ctx.fields.prompt,
        aspect_ratio: ctx.fields.aspectRatio || '16:9',
        duration: Number(ctx.fields.seconds) || 5,
        image_url: ctx.media.images?.[0] || undefined,
      },
    };
  },

  /**
   * 解析上游创建任务响应（可选）
   * 默认自动尝试获取 data.id / data.task_id / data.data?.id
   */
  parseSubmitResponse(data) {
    const taskId = data.id || data.task_id || data.data?.id;
    if (!taskId) throw new Error('上游未返回任务 ID');
    return { taskId: String(taskId) };
  },

  /**
   * 构造查询任务状态请求
   * @param {string} taskId 上游任务 ID
   * @param {object} ctx 执行上下文
   */
  buildQuery(taskId, ctx) {
    return {
      url: `${ctx.baseUrl}/v1/videos/generations/${taskId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
      },
    };
  },

  /**
   * 解析上游查询响应
   * @param {object} data 上游返回的 JSON
   * @returns {{ state: 'queued'|'processing'|'completed'|'failed', progress?: number, assets?: Array<{ url: string }>, error?: string }}
   */
  parseTaskResult(data) {
    const status = String(data.status || data.state || '').toLowerCase();

    if (['succeeded', 'success', 'completed', 'done'].includes(status)) {
      const videoUrl = data.video_url || data.output?.video_url || data.data?.video_url || data.url;
      if (!videoUrl) {
        return { state: 'failed', error: '上游报告完成但未返回视频地址' };
      }
      return {
        state: 'completed',
        progress: 100,
        assets: [{ url: videoUrl }],
      };
    }

    if (['failed', 'error', 'canceled'].includes(status)) {
      return {
        state: 'failed',
        error: data.error?.message || data.error || data.message || '生成失败',
      };
    }

    if (['queued', 'pending', 'waiting'].includes(status)) {
      return { state: 'queued' };
    }

    // 处理中
    return {
      state: 'processing',
      progress: typeof data.progress === 'number' ? data.progress : undefined,
    };
  },
};
