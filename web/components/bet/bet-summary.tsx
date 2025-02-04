import clsx from 'clsx'

import { formatMoney, formatWithCommas } from 'common/util/format'
import { Col } from '../layout/col'
import { Contract } from 'web/lib/firebase/contracts'
import { Row } from '../layout/row'
import { YesLabel, NoLabel } from '../outcome-label'
import { getContractBetMetrics, getProbability } from 'common/calculate'
import { InfoTooltip } from '../widgets/info-tooltip'
import { ProfitBadge } from '../profit-badge'
import { useSavedContractMetrics } from 'web/hooks/use-saved-contract-metrics'
import { ENV_CONFIG } from 'common/envs/constants'
import { ContractMetric } from 'common/contract-metric'
import { useUserContractBets } from 'web/hooks/use-user-bets'

export function UserBetsSummary(props: {
  contract: Contract
  initialMetrics?: ContractMetric
  className?: string
}) {
  const { contract, className } = props
  const metrics = useSavedContractMetrics(contract) ?? props.initialMetrics

  if (!metrics) return <></>
  return (
    <BetsSummary contract={contract} metrics={metrics} className={className} />
  )
}

export function BetsSummary(props: {
  contract: Contract
  metrics: ContractMetric
  className?: string
}) {
  const { contract, metrics, className } = props
  const { resolution, outcomeType } = contract
  const userBets = useUserContractBets(metrics.userId, contract.id)
  const { payout, invested, totalShares, profit, profitPercent } = userBets
    ? getContractBetMetrics(contract, userBets)
    : metrics

  const yesWinnings = totalShares.YES ?? 0
  const noWinnings = totalShares.NO ?? 0

  const position = yesWinnings - noWinnings
  const exampleOutcome = position < 0 ? 'NO' : 'YES'

  const isBinary = outcomeType === 'BINARY'
  const prob = isBinary ? getProbability(contract) : 0
  const expectation = prob * yesWinnings + (1 - prob) * noWinnings

  if (metrics.invested === 0 && metrics.profit === 0) return null

  return (
    <Col className={clsx(className, 'gap-4')}>
      <Row className="flex-wrap gap-4 sm:flex-nowrap sm:gap-6">
        {resolution ? (
          <Col>
            <div className="text-sm text-gray-500">Payout</div>
            <div className="whitespace-nowrap">
              {formatMoney(payout)}{' '}
              <ProfitBadge profitPercent={profitPercent} />
            </div>
          </Col>
        ) : isBinary ? (
          <Col>
            <div className="whitespace-nowrap text-sm text-gray-500">
              Position{' '}
              <InfoTooltip
                text={`Number of shares you own on net. 1 ${exampleOutcome} share = ${ENV_CONFIG.moneyMoniker}1 if the market resolves ${exampleOutcome}.`}
              />
            </div>
            <div className="whitespace-nowrap">
              {position > 1e-7 ? (
                <>
                  <YesLabel /> {formatWithCommas(position)}
                </>
              ) : position < -1e-7 ? (
                <>
                  <NoLabel /> {formatWithCommas(-position)}
                </>
              ) : (
                '——'
              )}
            </div>
          </Col>
        ) : (
          <Col className="hidden sm:inline">
            <div className="whitespace-nowrap text-sm text-gray-500">
              Expectation{''}
              <InfoTooltip text="The estimated payout of your position using the current market probability." />
            </div>
            <div className="whitespace-nowrap">{formatMoney(payout)}</div>
          </Col>
        )}

        <Col>
          <div className="whitespace-nowrap text-sm text-gray-500">
            Cost basis{' '}
            <InfoTooltip text="Cash originally invested in this market, using average cost accounting." />
          </div>
          <div className="whitespace-nowrap">{formatMoney(invested)}</div>
        </Col>

        {isBinary && !resolution && (
          <Col className="hidden sm:inline">
            <div className="whitespace-nowrap text-sm text-gray-500">
              Expectation{' '}
              <InfoTooltip text="The estimated payout of your position using the current market probability." />
            </div>
            <div className="whitespace-nowrap">{formatMoney(expectation)}</div>
          </Col>
        )}

        <Col>
          <div className="whitespace-nowrap text-sm text-gray-500">
            Profit{' '}
            <InfoTooltip text="Includes both realized & unrealized gains/losses." />
          </div>
          <div className="whitespace-nowrap">
            {formatMoney(profit)}
            <ProfitBadge profitPercent={profitPercent} />
          </div>
        </Col>
      </Row>
    </Col>
  )
}
