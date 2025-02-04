import React, { useEffect, useState } from 'react'
import Router from 'next/router'
import clsx from 'clsx'
import { sum } from 'lodash'

import { Col } from 'web/components/layout/col'
import { User } from 'common/user'
import {
  usePrivateUser,
  useUserContractMetricsByProfit,
} from 'web/hooks/use-user'
import { Row } from 'web/components/layout/row'
import { formatMoney } from 'common/util/format'
import {
  BettingStreakModal,
  hasCompletedStreakToday,
} from 'web/components/profile/betting-streak-modal'
import { LoansModal } from 'web/components/profile/loans-modal'
import Link from 'next/link'

const dailyStatsHeaderClass = 'text-gray-500 text-xs font-thin'
const dailyStatsClass = 'items-center text-lg'
const rainbowClass = 'text-rainbow'
export function DailyStats(props: {
  user: User | null | undefined
  showLoans?: boolean
}) {
  const { user, showLoans } = props

  const privateUser = usePrivateUser()
  const streaks = privateUser?.notificationPreferences?.betting_streaks ?? []
  const streaksHidden = streaks.length === 0

  const [showLoansModal, setShowLoansModal] = useState(false)
  useEffect(() => {
    const showLoansModel = Router.query['show'] === 'loans'
    setShowLoansModal(showLoansModel)
    const showStreaksModal = Router.query['show'] === 'betting-streak'
    setShowStreakModal(showStreaksModal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [showStreakModal, setShowStreakModal] = useState(false)

  return (
    <Row className={'flex-shrink-0 gap-4'}>
      <DailyProfit user={user} />

      {!streaksHidden && (
        <Col
          className="cursor-pointer"
          onClick={() => setShowStreakModal(true)}
        >
          <div className={dailyStatsHeaderClass}>Streak</div>
          <Row
            className={clsx(
              dailyStatsClass,
              user && !hasCompletedStreakToday(user) && 'grayscale'
            )}
          >
            <span>{user?.currentBettingStreak ?? 0}🔥</span>
          </Row>
        </Col>
      )}
      {showLoans && (
        <Col
          className="flex cursor-pointer"
          onClick={() => setShowLoansModal(true)}
        >
          <div className={dailyStatsHeaderClass}>Next loan</div>
          <Row
            className={clsx(
              dailyStatsClass,
              user && !hasCompletedStreakToday(user) && 'grayscale'
            )}
          >
            <span className="text-teal-500">
              🏦 {formatMoney(user?.nextLoanCached ?? 0)}
            </span>
          </Row>
        </Col>
      )}
      {showLoansModal && (
        <LoansModal isOpen={showLoansModal} setOpen={setShowLoansModal} />
      )}
      {showStreakModal && (
        <BettingStreakModal
          isOpen={showStreakModal}
          setOpen={setShowStreakModal}
          currentUser={user}
        />
      )}
    </Row>
  )
}

export function DailyProfit(props: { user: User | null | undefined }) {
  const { user } = props

  const contractMetricsByProfit = useUserContractMetricsByProfit(user?.id)
  const profit = sum(
    contractMetricsByProfit?.metrics.map((m) =>
      m.from ? m.from.day.profit : 0
    ) ?? []
  )
  const profitable = profit > 0
  return (
    <Link className="mr-2 flex flex-col" href="/daily-movers">
      <div
        className={clsx(dailyStatsHeaderClass, profitable && rainbowClass)}
        style={
          profitable ? { textShadow: '-0.1px -0.1px rgba(0,0,0,0.2)' } : {}
        }
      >
        Daily profit
      </div>
      <Row className={clsx(dailyStatsClass, profitable && 'text-teal-500')}>
        <span>{formatMoney(profit)}</span>{' '}
      </Row>
    </Link>
  )
}
