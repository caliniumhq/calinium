'use strict';

function releaseMarkdown(manifest) {
  return `# Calinium release candidate\n\n- Release: \`${manifest.release_id}\`\n- Deployment: \`${manifest.deployment_id}\`\n- Target: \`${manifest.released_theme.theme_name}\` (\`${manifest.released_theme.theme_id}\`)\n- Role: \`${manifest.released_theme.role}\`\n- Preview verification: \`${manifest.preview_verification.path}\`\n- Released configuration files: ${manifest.released_files.length}\n- Status: \`${manifest.release_status}\`\n\nThis is a release candidate for an unpublished/development theme. It does not publish or modify a live Shopify theme.\n`;
}

module.exports = { releaseMarkdown };
