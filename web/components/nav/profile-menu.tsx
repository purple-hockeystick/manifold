import Link from 'next/link'

import { User } from 'web/lib/firebase/users'
import { formatMoney } from 'common/util/format'
import { Avatar } from '../widgets/avatar'
import { trackCallback } from 'web/lib/service/analytics'
import { useState } from 'react'
import { AddFundsModal } from '../add-funds-modal'
import { PlusIcon } from '@heroicons/react/outline'

export function ProfileSummary(props: { user: User }) {
  const { user } = props

  const [buyModalOpen, setBuyModalOpen] = useState(false)

  return (
    <Link
      href={`/${user.username}?tab=portfolio`}
      onClick={trackCallback('sidebar: profile')}
      className="group mb-3 flex flex-row items-center gap-4 truncate rounded-md py-3 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
    >
      <Avatar avatarUrl={user.avatarUrl} username={user.username} noLink />
      <div className="truncate">
        <div>{user.name}</div>
        <div className="flex items-center text-sm">
          <span className="mr-2">{formatMoney(Math.floor(user.balance))}</span>
          <button
            className="rounded-md p-1 ring-[1.5px] ring-inset ring-current hover:bg-gray-300"
            onClick={(e) => {
              e.preventDefault()
              setBuyModalOpen(true)
            }}
          >
            <div className="sr-only">Get mana</div>
            <PlusIcon className="h-2 w-2" strokeWidth="4.5" />
          </button>
          <AddFundsModal open={buyModalOpen} setOpen={setBuyModalOpen} />
        </div>
      </div>
    </Link>
  )
}
