import React, { FC } from "react"
import Alert from "./Alert"
import Button from "../action/Button"
import IconSoundMute from "../icon/IconSoundMute"

interface Props {
  onClick: () => void
}

const AutoplayAlert: FC<Props> = ({ onClick }) => {
  return (
    <Alert className={"rounded opacity-90"}>
      Звук был отключен для автовоспроизведения.
      <Button className={"p-2 mr-4"} onClick={onClick} tooltip={"Unmute"}>
        <IconSoundMute />
      </Button>
    </Alert>
  )
}

export default AutoplayAlert


// import React, { FC, useState, useEffect } from "react"
// import Alert from "./Alert"
// import Button from "../action/Button"
// import IconSoundMute from "../icon/IconSoundMute"

// interface Props {
//   onClick: () => void
// }

// const AutoplayAlert: FC<Props> = ({ onClick }) => {
//   // состояние для звука
//   const [isMuted, setIsMuted] = useState(false) // false = звук включён по умолчанию

//   useEffect(() => {
//     if (!isMuted) {
//       // включаем звук при монтировании компонента
//       onClick() // вызываем переданный callback, например для включения звука
//     }
//   }, [])

//   if (isMuted) {
//     return (
//       <Alert className={"rounded opacity-90"}>
//         Звук был отключен для автовоспроизведения.
//         <Button
//           className={"p-2 mr-4"}
//           onClick={() => {
//             setIsMuted(false)
//             onClick()
//           }}
//           tooltip={"Unmute"}
//         >
//           <IconSoundMute />
//         </Button>
//       </Alert>
//     )
//   }

//   return null // если звук включён, алерт не показываем
// }

// export default AutoplayAlert
