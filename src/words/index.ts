import ad from './ads'
import politics from './politics'
import violence from './violence'
import porn from './porn'
import cult from './cult'
import abuse from './abuse'

const defaultWords = ad.concat(politics).concat(violence).concat(porn).concat(cult).concat(abuse)

export default defaultWords
