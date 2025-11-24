"use client"
import { FC, ReactNode, useState } from "react"
import { MediaElement, MediaOption, Subtitle } from "../../lib/types"
import DropUp from "../action/DropUp"
import InputRadio from "../input/InputRadio"
import ControlButton from "../input/ControlButton"
import IconCC from "../icon/IconCC"
import IconClose from "../icon/IconClose"
import IconCog from "../icon/IconCog"
import IconChevron from "../icon/IconChevron"
import IconSettings from "../icon/IconSettings"
import classNames from "classnames"
import Button from "../action/Button"
import IconLoop from "../icon/IconLoop"
import IconShare from "components/icon/IconShare"
import Link from "next/link"
import IconNewTab from "components/icon/IconNewTab"
import { useRouter } from 'next/navigation'

interface Props {
  roomId: string
  playing: MediaElement
  currentSrc: MediaOption
  setCurrentSrc: (src: MediaOption) => void
  currentSub: Subtitle
  setCurrentSub: (sub: Subtitle) => void
  loop: boolean
  setLoop: (loop: boolean) => void
  interaction: (touch: boolean) => void
  playbackRate: number
  setPlaybackRate: (playbackRate: number) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
}

interface Tab {
  icon: ReactNode
  title: ReactNode
  content: ReactNode
}

const PlayerMenu: FC<Props> = ({
  roomId,
  playing,
  currentSrc,
  setCurrentSrc,
  currentSub,
  setCurrentSub,
  loop,
  setLoop,
  interaction,
  playbackRate,
  setPlaybackRate,
  menuOpen,
  setMenuOpen,
}) => {
  const [tab, setTab] = useState(-1)
  const router = useRouter()

  const tabs: Tab[] = [
    {
      icon: <IconSettings />,
      title: "Скорость воспроизведения",
      content: (
        <InputRadio
          value={playbackRate.toString()}
          options={[
            "3",
            "2",
            "1.75",
            "1.5",
            "1.25",
            "1",
            "0.75",
            "0.5",
            "0.25",
          ]}
          setValue={(rate) => setPlaybackRate(parseFloat(rate))}
          interaction={interaction}
        />
      ),
    },
    {
      icon: <IconLoop />,
      title: "повтор",
      content: (
        <Button tooltip={"Click to toggle loop"} onClick={() => setLoop(!loop)}>
          {loop ? "Отключить повтор" : "Включить повтор"}
        </Button>
      ),
    },
    {
      icon: <IconShare />,
      title: "Открыть вставку",
      content: (
        <div className="flex flex-col">
        <Button tooltip="Switch to full player" className="action flex flex-row gap-1 p-2" onClick={() => {
          router.push("/player/" + roomId)
        }}>
          <IconNewTab />
          <span>
          Переключиться на полную версию проигрывателя
          </span>
        </Button>
        <Button tooltip="Switch to embed player" className="action flex flex-row gap-1 p-2" onClick={() => {
          router.push("/embed/" + roomId)
        }}>
          <IconNewTab />
          <span>
          Переключиться на встроенный плеер
          </span>
        </Button>
          <Link href={"/player/" + roomId} target="_blank" className="action flex flex-row gap-1 p-2">
            <IconNewTab />
            <span>
            Открыть полный плеер в новой вкладке
            </span>
          </Link>
          <Link href={"/embed/" + roomId} target="_blank" className="action flex flex-row gap-1 p-2">
            <IconNewTab />
            <span>
            Открыть встроенный плеер в новой вкладке
            </span>
          </Link>
        </div>
      )
    }
  ]

  if (playing.src.length > 1) {
    tabs.push({
      icon: <IconSettings />,
      title: "Resolution",
      content: (
        <InputRadio
          value={currentSrc.resolution}
          options={playing.src.map((option) => option.resolution)}
          setValue={(resolution) => {
            const newSrc = playing.src.find(
              (src) => src.resolution === resolution
            )
            if (newSrc) {
              setCurrentSrc(newSrc)
            } else {
              console.error(
                "Невозможное разрешение",
                resolution,
                "не найдено в",
                playing
              )
            }
          }}
          interaction={interaction}
        />
      ),
    })
  }

  if (playing.sub.length > 1) {
    tabs.push({
      icon: <IconCC />,
      title: "Subtitle",
      content: (
        <InputRadio
          value={currentSub.lang}
          options={playing.sub.map((sub) => sub.lang)}
          setValue={(lang) => {
            const newSub = playing.sub.find((sub) => sub.lang === lang)
            if (newSub) {
              setCurrentSub(newSub)
            } else {
              console.error("Невозможная подлодка", newSub, "не найдено в", playing)
            }
          }}
          interaction={interaction}
        />
      ),
    })
  }

  const displayIcon = (icon: ReactNode, className: string = "") => {
    return <div className={classNames("w-8", className)}>{icon}</div>
  }

  return (
    <DropUp
      tooltip={"settings"}
      className={"-left-[180px] bg-dark-900/90"}
      open={menuOpen}
      menuChange={setMenuOpen}
      interaction={interaction}
      buttonContent={<IconCog />}
    >
      <div className={"w-[240px]"}>
        <div className={"flex no-wrap items-center flex-row"}>
          {tab >= 0 && (
            <>
              <ControlButton
                tooltip={"Go back"}
                onClick={() => setTab(-1)}
                interaction={interaction}
              >
                <IconChevron direction={"left"} />
              </ControlButton>
              {displayIcon(tabs[tab].icon, "ml-1")}
              <div className={"px-1"}>{tabs[tab].title}</div>
            </>
          )}
          <ControlButton
            tooltip={"Close menu"}
            className={"ml-auto"}
            onClick={() => setMenuOpen(false)}
            interaction={interaction}
          >
            <IconClose />
          </ControlButton>
        </div>
        {tab < 0 &&
          tabs.map((t, index) => (
            <ControlButton
              tooltip={"Adjust " + t.title}
              key={t.title + "-" + index}
              onClick={() => setTab(index)}
              interaction={interaction}
              className={"flex flex-row items-center"}
            >
              {displayIcon(t.icon)}
              {t.title}
            </ControlButton>
          ))}
        {tab >= 0 && tabs[tab].content}
      </div>
    </DropUp>
  )
}

export default PlayerMenu
