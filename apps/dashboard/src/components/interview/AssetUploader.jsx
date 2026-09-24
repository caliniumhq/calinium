import { useId, useState } from 'react';
import { t } from '../../lib/i18n';

export function AssetUploader({ question, assetService, value, onCommit }) {
  const inputId = useId();
  const [state, setState] = useState({ status: 'idle', message: null, asset: null });
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setState({ status: 'uploading', message: null, asset: null });
    try {
      const result = await assetService.uploadAsset({ file, assetType: question.ui?.asset_type || 'miscellaneous_reference', displayTitle: file.name });
      setState({ status: 'ready', message: null, asset: result.asset });
      await onCommit(question.id, result.asset.id);
    } catch (error) { setState({ status: 'error', message: error.message, asset: null }); }
  };
  const previewUrl = value ? assetService.assetDownloadUrl(value) : state.asset ? assetService.assetDownloadUrl(state.asset.id) : null;
  return <div className="asset-uploader"><label htmlFor={inputId} className="button button--quiet">{state.status === 'uploading' ? t('assets.uploading') : value ? t('assets.replace_logo') : t('assets.choose_file')}</label><input id={inputId} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={state.status === 'uploading'} />{previewUrl && <div className="asset-uploader__preview"><img src={previewUrl} alt={t('assets.logo_preview')} /><span>{t('assets.uploaded')}</span></div>}{state.status === 'uploading' && <p role="status">{t('assets.uploading')}</p>}{state.message && <p className="form-error" role="alert">{state.message}</p>}<p>{t('assets.logo_upload_hint')}</p></div>;
}
