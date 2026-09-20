'use strict';

/**
 * Sora 视频插件驱动
 * 纯函数无依赖，处理标准 OpenAI 视频生成协议
 */
module.exports = {
  buildSubmit(ctx) {
    const body = {
      model: ctx.model,
      prompt: ctx.fields.prompt,
      size: ctx.fields.aspectRatio === '9:16' ? '720x1280' : (ctx.fields.aspectRatio === '1:1' ? '1024x1024' : '1280x720'),
      duration: Number(ctx.fields.seconds) || 5,
    };
    if (ctx.media.images && ctx.media.images.length > 0) {
      body.input_reference = ctx.media.images[0];
    }
    return {
      url: `${ctx.baseUrl}/v1/videos`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    };
  },

  parseSubmitResponse(data) {
    const taskId = data.id || data.task_id || data.data?.id;
    if (!taskId) throw new Error('OpenAI 未返回任务 ID');
    return { taskId: String(taskId) };
  },

  buildQuery(taskId, ctx) {
    return {
      url: `${ctx.baseUrl}/v1/videos/${taskId}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${ctx.apiKey}`,
      },
    };
  },

  parseTaskResult(data) {
    const status = String(data.status || '').toLowerCase();
    if (status === 'completed' || status === 'succeeded') {
      const url = data.url || data.video_url || (Array.isArray(data.output) ? data.output[0] : null);
      if (!url) return { state: 'failed', error: '上游完成但未包含视频下载地址' };
      return {
        state: 'completed',
        progress: 100,
        assets: [{ url }],
      };
    }
    if (status === 'failed') {
      return {
        state: 'failed',
        error: data.error?.message || data.error || '视频生成失败',
      };
    }
    if (status === 'queued') {
      return { state: 'queued' };
    }
    return {
      state: 'processing',
      progress: typeof data.progress === 'number' ? data.progress : undefined,
    };
  },
};
