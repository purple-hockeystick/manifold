import { sortBy, partition, sum } from 'lodash'
import { useEffect, useState } from 'react'
import { ChatIcon } from '@heroicons/react/outline'

import { FreeResponseContract, MultipleChoiceContract } from 'common/contract'
import { Col } from '../layout/col'
import { usePrivateUser, useUser } from 'web/hooks/use-user'
import { tradingAllowed } from 'web/lib/firebase/contracts'
import { AnswerItem } from './answer-item'
import { CreateAnswerPanel } from './create-answer-panel'
import { AnswerResolvePanel } from './answer-resolve-panel'
import { Spacer } from '../layout/spacer'
import { getOutcomeProbability } from 'common/calculate'
import { Answer } from 'common/answer'
import clsx from 'clsx'
import { formatPercent } from 'common/util/format'
import { Modal } from 'web/components/layout/modal'
import { AnswerBetPanel } from 'web/components/answers/answer-bet-panel'
import { Row } from 'web/components/layout/row'
import { Avatar } from 'web/components/widgets/avatar'
import { Linkify } from 'web/components/widgets/linkify'
import { Button } from 'web/components/buttons/button'
import { useAdmin } from 'web/hooks/use-admin'
import { CHOICE_ANSWER_COLORS } from '../charts/contract/choice'
import { useChartAnswers } from '../charts/contract/choice'

export function getAnswerColor(answer: Answer, answersArray: string[]) {
  const colorIndex = answersArray.indexOf(answer.text)
  return colorIndex != undefined && colorIndex < CHOICE_ANSWER_COLORS.length
    ? CHOICE_ANSWER_COLORS[colorIndex]
    : '#B1B1C7'
}

export function AnswersPanel(props: {
  contract: FreeResponseContract | MultipleChoiceContract
  onAnswerCommentClick: (answer: Answer) => void
}) {
  const isAdmin = useAdmin()
  const { contract, onAnswerCommentClick } = props
  const { creatorId, resolution, resolutions, outcomeType } = contract
  const [showAllAnswers, setShowAllAnswers] = useState(false)

  const isMultipleChoice = outcomeType === 'MULTIPLE_CHOICE'

  const answers = contract.answers.filter(
    (a) => a.number != 0 || isMultipleChoice
  )

  const answersToHide =
    isMultipleChoice || answers.length <= 5
      ? []
      : answers.filter(
          (answer) => getOutcomeProbability(contract, answer.id) < 0.01
        )

  const [winningAnswers, losingAnswers] = partition(
    answers.filter((answer) =>
      showAllAnswers ? true : !answersToHide.find((a) => answer.id === a.id)
    ),
    (answer) =>
      answer.id === resolution || (resolutions && resolutions[answer.id])
  )
  const sortedAnswers = [
    ...sortBy(winningAnswers, (answer) =>
      resolutions ? -1 * resolutions[answer.id] : 0
    ),
    ...sortBy(
      resolution ? [] : losingAnswers,
      (answer) => -1 * getOutcomeProbability(contract, answer.id)
    ),
  ]

  const answerItems = sortBy(
    losingAnswers.length > 0 ? losingAnswers : sortedAnswers,
    (answer) => -getOutcomeProbability(contract, answer.id)
  )

  const user = useUser()
  const privateUser = usePrivateUser()

  const [resolveOption, setResolveOption] = useState<
    'CHOOSE' | 'CHOOSE_MULTIPLE' | 'CANCEL' | undefined
  >()
  const [chosenAnswers, setChosenAnswers] = useState<{
    [answerId: string]: number
  }>({})

  const chosenTotal = sum(Object.values(chosenAnswers))

  const onChoose = (answerId: string, prob: number) => {
    if (resolveOption === 'CHOOSE') {
      setChosenAnswers({ [answerId]: prob })
    } else {
      setChosenAnswers((chosenAnswers) => {
        return {
          ...chosenAnswers,
          [answerId]: prob,
        }
      })
    }
  }

  const onDeselect = (answerId: string) => {
    setChosenAnswers((chosenAnswers) => {
      const newChosenAnswers = { ...chosenAnswers }
      delete newChosenAnswers[answerId]
      return newChosenAnswers
    })
  }

  useEffect(() => {
    setChosenAnswers({})
  }, [resolveOption])

  const showChoice = resolution
    ? undefined
    : resolveOption === 'CHOOSE'
    ? 'radio'
    : resolveOption === 'CHOOSE_MULTIPLE'
    ? 'checkbox'
    : undefined

  const answersArray = useChartAnswers(contract).map(
    (answer, _index) => answer.text
  )

  return (
    <Col className="gap-3">
      {(resolveOption || resolution) &&
        sortedAnswers.map((answer) => (
          <AnswerItem
            key={answer.id}
            answer={answer}
            contract={contract}
            showChoice={showChoice}
            chosenProb={chosenAnswers[answer.id]}
            totalChosenProb={chosenTotal}
            onChoose={onChoose}
            onDeselect={onDeselect}
          />
        ))}

      {!resolveOption && (
        <Col
          className={clsx(
            'gap-2 pr-2 md:pr-0',
            tradingAllowed(contract) ? '' : '-mb-6'
          )}
        >
          {answerItems.map((item) => (
            <OpenAnswer
              key={item.id}
              answer={item}
              contract={contract}
              onAnswerCommentClick={onAnswerCommentClick}
              color={getAnswerColor(item, answersArray)}
            />
          ))}
          {answersToHide.length > 0 && !showAllAnswers && (
            <Button
              className="self-end"
              color="gray-white"
              onClick={() => setShowAllAnswers(true)}
              size="md"
            >
              Show More
            </Button>
          )}
        </Col>
      )}

      {answers.length === 0 && (
        <div className="pb-4 text-gray-500">No answers yet...</div>
      )}

      {outcomeType === 'FREE_RESPONSE' &&
        tradingAllowed(contract) &&
        !privateUser?.blockedByUserIds.includes(contract.creatorId) && (
          <CreateAnswerPanel contract={contract} />
        )}

      {(user?.id === creatorId || isAdmin) && !resolution && (
        <>
          <Spacer h={2} />
          <AnswerResolvePanel
            isAdmin={isAdmin}
            isCreator={user?.id === creatorId}
            contract={contract}
            resolveOption={resolveOption}
            setResolveOption={setResolveOption}
            chosenAnswers={chosenAnswers}
          />
        </>
      )}
    </Col>
  )
}

function OpenAnswer(props: {
  contract: FreeResponseContract | MultipleChoiceContract
  answer: Answer
  color: string
  onAnswerCommentClick: (answer: Answer) => void
}) {
  const { answer, contract, onAnswerCommentClick, color } = props
  const { username, avatarUrl, text } = answer
  const prob = getOutcomeProbability(contract, answer.id)
  const probPercent = formatPercent(prob)
  const [betMode, setBetMode] = useState<'buy' | 'short-sell' | undefined>(
    undefined
  )
  const colorWidth = 100 * Math.max(prob, 0.01)
  const isDpm = contract.mechanism === 'dpm-2'
  const isFreeResponse = contract.outcomeType === 'FREE_RESPONSE'

  return (
    <Col className="my-1 px-2">
      <Modal
        open={!!betMode}
        setOpen={(open) => setBetMode(open ? 'buy' : undefined)}
      >
        {betMode && (
          <AnswerBetPanel
            answer={answer}
            contract={contract}
            mode={betMode}
            closePanel={() => setBetMode(undefined)}
            className="sm:max-w-84 !rounded-md bg-white !px-8 !py-6"
            isModal={true}
          />
        )}
      </Modal>

      <Col
        className={clsx(
          'relative w-full rounded-lg transition-all',
          tradingAllowed(contract) ? 'text-gray-900' : 'text-gray-500'
        )}
        style={{
          background: `linear-gradient(to right, ${color}90 ${colorWidth}%, #FBFBFF ${colorWidth}%)`,
        }}
      >
        <Row className="z-20 -mb-1 justify-between gap-2 py-2 px-3">
          <Row>
            <Avatar
              className="mt-0.5 mr-2 inline h-5 w-5 border border-transparent transition-transform hover:border-none"
              username={username}
              avatarUrl={avatarUrl}
            />
            <Linkify className="text-md whitespace-pre-line" text={text} />
          </Row>
          <Row className="gap-2">
            <div className="my-auto text-xl">{probPercent}</div>
            {tradingAllowed(contract) &&
              (isDpm ? (
                <Button
                  size="2xs"
                  color="gray-outline"
                  onClick={() => setBetMode('buy')}
                  className="my-auto"
                >
                  Buy
                </Button>
              ) : (
                <Row className="gap-2">
                  <Button
                    size="2xs"
                    color="green"
                    onClick={() => setBetMode('buy')}
                    className="my-auto"
                  >
                    YES
                  </Button>
                  <Button
                    size="2xs"
                    color="red"
                    onClick={() => setBetMode('short-sell')}
                    className="my-auto"
                  >
                    NO
                  </Button>
                </Row>
              ))}
            {isFreeResponse && (
              <button
                className="p-1"
                onClick={() => onAnswerCommentClick(answer)}
              >
                <ChatIcon className="h-5 w-5 text-gray-400 transition-colors hover:text-gray-600" />
              </button>
            )}
          </Row>
        </Row>
      </Col>
    </Col>
  )
}
