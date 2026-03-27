import { SpaceStrategy } from './strategy';
import { GuillotineStrategy } from './guillotine';
import { StripLockStrategy } from './stripLock';
import { EngineConfig } from '../types/engine';

export function createSpaceStrategy(config: EngineConfig): SpaceStrategy {
  return config.features.useStripLock ? new StripLockStrategy() : new GuillotineStrategy();
}
