import { AnalysisFirstMerchantJourney } from './AnalysisFirstMerchantJourney';
import { fixtureExperience } from '../../fixtures/analysis-first-experience-fixtures';

export function AnalysisFirstMerchantExperienceHarness({ fixtureId, ...props }) {
  return <AnalysisFirstMerchantJourney experience={fixtureExperience(fixtureId)} {...props} />;
}
