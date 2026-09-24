'use strict';

const path = require('path');

const repositoryRoot = path.resolve(__dirname, '../../..');
const interviewEngine = require(path.join(repositoryRoot, 'ai', 'merchant-interview', 'merchant-interview-engine.js'));

function catalogFor(adapter) {
  return adapter.engine.loadMerchantInterview({ root: adapter.repositoryRoot }).catalog;
}

class InterviewEngineAdapter {
  constructor({ root = repositoryRoot, engine = interviewEngine } = {}) {
    this.repositoryRoot = root;
    this.engine = engine;
  }

  load() {
    const { catalog } = this.engine.loadMerchantInterview({ root: this.repositoryRoot });
    return { catalog };
  }

  inspect({ answers = {} }) {
    return this.engine.inspectInterview({ root: this.repositoryRoot, answers });
  }

  validate({ answers = {}, requireComplete = false }) {
    return this.engine.validateAnswers({ catalog: catalogFor(this), answers, requireComplete });
  }

  create({ sessionId, createdAt }) {
    return { session: this.engine.createInterviewSession({ root: this.repositoryRoot, catalog: catalogFor(this), sessionId, createdAt }) };
  }

  save({ session, answerPatch, savedAt }) {
    return this.engine.saveProgress({ root: this.repositoryRoot, catalog: catalogFor(this), session, answerPatch, savedAt });
  }

  resume({ session, resumedAt }) {
    return { session: this.engine.resumeInterviewSession({ root: this.repositoryRoot, catalog: catalogFor(this), session, resumedAt }) };
  }

  preview({ session, enrichmentContext = {} }) {
    return this.engine.previewInterviewSummary({ root: this.repositoryRoot, catalog: catalogFor(this), session, enrichmentContext });
  }

  complete({ session, completedAt, enrichmentContext = {} }) {
    return this.engine.completeInterviewSession({ root: this.repositoryRoot, catalog: catalogFor(this), session, confirmedSummary: true, completedAt, enrichmentContext });
  }

  abandon({ session, abandonedAt }) {
    return { session: this.engine.abandonInterviewSession({ root: this.repositoryRoot, catalog: catalogFor(this), session, abandonedAt }) };
  }
}

module.exports = { InterviewEngineAdapter, repositoryRoot };
