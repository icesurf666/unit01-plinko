import { formatUnits } from 'viem';

const UNIT_DECIMALS = 18;

function addThousandsSeparators(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatUnitBalance(balance?: bigint): string {
  if (balance === undefined) return '0';

  const [whole, fraction = ''] = formatUnits(balance, UNIT_DECIMALS).split('.');
  const visibleFraction = fraction.slice(0, 2).replace(/0+$/, '');

  return visibleFraction
    ? `${addThousandsSeparators(whole)}.${visibleFraction}`
    : addThousandsSeparators(whole);
}
