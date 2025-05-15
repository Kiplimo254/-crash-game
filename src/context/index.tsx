import { createContext } from 'react';
import { BettedUserType, ContextDataType } from '../types/context';

interface ContextType {
  state: ContextDataType;
  previousHand: BettedUserType[];
  bettedUsers: BettedUserType[];
  getMyBets: () => void;
  // ... other properties
}

const Context = createContext<ContextType>({
  state: {} as ContextDataType,
  previousHand: [],
  bettedUsers: [],
  getMyBets: () => {},
  // ... other default values
});

export default Context; 