<template>
  <div class="faqContainer">
    <h1>{{ $t('FAQ.title') }}</h1>
    <div>
      <ol>
        <li
          v-for="(block, i) in faq"
          :key="`BlockLink${i}`"
          class="outlineListElement"
        >
          {{ $t(`FAQ.${block.header}`) }}
        </li>
        <li class="outlineListElement">{{ $t('FAQ.techStack.header') }}</li>
      </ol>
    </div>
    <template
      v-for="(block, i) in faq"
      :key="`Block${i}`"
    >
      <h2>{{ $t(`FAQ.${block.header}`) }}</h2>
      <Accordion>
        <AccordionTab
          v-for="(qa, qaI) in block.data"
          :key="`Block${i}QA${qaI}`"
          :header="$t(`FAQ.${qa.q}`)"
        >
          <p v-html="$t(`FAQ.${qa.a}`, qa.par ?? {})" />
        </AccordionTab>
      </Accordion>
    </template>

    <h2>{{ $t('FAQ.techStack.header') }}</h2>
    <Accordion>
      <AccordionTab :header="$t('FAQ.techStack.header')">
        <p>{{ $t('FAQ.techStack.description') }}</p>
        <div style="display: flex; flex-wrap: wrap; justify-content: center">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://nodejs.org/en/"
          >
            <img
              src="https://nodejs.org/static/images/logos/nodejs-new-pantone-black.svg"
              class="logo"
              alt="NodeJS Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://expressjs.com/"
          >
            <img
              src="https://www.vectorlogo.zone/logos/expressjs/expressjs-ar21.svg"
              class="logo"
              alt="ExpressJS Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://socket.io/"
          >
            <img
              src="https://cdn.worldvectorlogo.com/logos/socket-io.svg"
              class="logo"
              alt="Socket.io Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.primefaces.org/primevue/showcase/#/"
          >
            <img
              src="https://www.primefaces.org/primevue/resources/images/primevue-logo.svg"
              class="logo"
              alt="Primevue Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://nodemailer.com/about/"
          >
            <img
              src="https://nodemailer.com/nm_logo_200x136.png"
              class="logo"
              alt="Nodemailer Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://kazupon.github.io/vue-i18n/"
          >
            <img
              src="https://kazupon.github.io/vue-i18n/vue-i18n-logo.png"
              class="logo"
              alt="vue-i18n Logo"
            />
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.postgresql.org/"
          >
            <img
              src="https://www.postgresql.org/media/img/about/press/elephant.png"
              class="logo"
              alt="Postgres Logo"
            />
          </a>
        </div>
        <div style="display: flex; flex-direction: column">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://socket.io/"
          >
            Splitpanes
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.npmjs.com/package/ical-generator"
          >
            ical-generator
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.npmjs.com/package/vue-cropperjs"
          >
            vue-cropperjs
          </a>
        </div>
      </AccordionTab>
    </Accordion>
  </div>
</template>

<script setup lang="ts">
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'

const faq = [
  {
    header: 'Contribute.header',
    data: [
      {
        q: 'Contribute.localesQ',
        a: 'Contribute.localesA',
        par: { link: 'https://github.com/panwauu/tac-with-bug' },
      },
      {
        q: 'Contribute.bugsQ',
        a: 'Contribute.bugsA',
        par: null,
      },
    ],
  },
  {
    header: 'Game.header',
    data: [
      {
        q: 'Game.unfairCardsQ',
        a: 'Game.unfairCardsA',
        par: null,
      },
      {
        q: 'Game.teufelNoCardsQ',
        a: 'Game.teufelNoCardsA',
        par: null,
      },
      {
        q: 'Game.tacNotPlayingQ',
        a: 'Game.tacNotPlayingA',
        par: null,
      },
    ],
  },
  {
    header: 'documentedBugs.header',
    data: [
      {
        q: 'documentedBugs.sevenSplitQ',
        a: 'documentedBugs.sevenSplitA',
        par: null,
      },
    ],
  },
]
</script>

<style scoped>
.faqContainer {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.logo {
  height: 30px;
  object-fit: contain;
  margin: 20px;
}

.outlineListElement {
  padding: 5px 0 5px 20px;
  text-align: left;
}
</style>
