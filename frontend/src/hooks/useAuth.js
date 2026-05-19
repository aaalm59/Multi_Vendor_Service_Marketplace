import { useSelector } from 'react-redux'

export const useAuth = () => {
  const auth = useSelector((state) => state.auth)
  return auth
}

export const useUI = () => {
  const ui = useSelector((state) => state.ui)
  return ui
}
