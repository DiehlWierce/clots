import { createApp } from 'vue'
import App from './App.vue'

// PrimeVue
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'

// Стили
import 'primevue/resources/themes/saga-blue/theme.css' // база (переопределим)
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import './styles/base.css'
import './styles/theme.css'
import './styles/clot.css'

const app = createApp(App)

app.use(PrimeVue, { ripple: true })

app.component('Button', Button)
app.component('Card', Card)
app.component('ProgressSpinner', ProgressSpinner)

app.mount('#app')