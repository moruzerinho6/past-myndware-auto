import puppeteer from "puppeteer"
import "dotenv/config"
import { fileURLToPath } from "url"
import pLimit from 'p-limit'

import path from "path"
import prompts from "prompts"
import fs from "fs"

const fsp = fs.promises
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

if (!process.env.CLOUD_LOGIN || !process.env.CLOUD_PASSWORD) {
  console.error(
    "Coloque as credenciais de login no arquivo .env antes de usar a aplicação."
  )
  process.exit(1)
}

const documentType = {
  register_driver: {
    unit: 'abunchofrandomnumbersandletters'
  },
  register_base: {
    unit: 'abunchofrandomnumbersandletters'
  },
  fornecedor: "abunchofrandomnumbersandletters",
  capeante: "abunchofrandomnumbersandletters",
  empresas: "abunchofrandomnumbersandletters",
}

const driverRequirementsQuestions = [
  {
    type: "text",
    name: "name",
    message: "Qual o nome do motorista?",
  },
  {
    type: "text",
    name: "plate",
    message: "Qual a placa do carro?",
  },
  {
    type: "confirm",
    name: "confirm",
    message: "Confirma?",
    initial: true,
  },
]

const baseRequirementsQuestions = [
  {
    type: "text",
    name: "code",
    message: "Qual o código da base?",
  },
  {
    type: "text",
    name: "social_reason",
    message: "Qual a razão social?",
  },
  {
    type: "confirm",
    message: "Confirma?",
    name: "confirm",
    initial: true,
  },
]

;(async () => {
  console.clear()
  const intention = await prompts({
    type: "multiselect",
    name: "intention",
    message: "O que deseja fazer?",
    choices: [
      { title: "Cadastrar Motorista", value: "register_driver" },
      { title: "Cadastrar Base", value: "register_base" },
    ],
    min: 1,
    max: 1,
    hint: "- Espaço para marcar. Enter para confirmar.",
  })

  const intent = intention.intention[0]
  const bases = Object.keys(documentType[intent])
  const registerLocationIntention = await prompts({
    type: "multiselect",
    name: "location",
    message: "Onde deseja registrar?",
    choices: bases,
    min: 1,
    max: 1,
    hint: "- Espaço para marcar. Enter para confirmar.",
  })

  const baseIntentIndex = registerLocationIntention.location[0]

  const askRequirements = await prompts(
    intent === "register_driver"
      ? driverRequirementsQuestions
      : baseRequirementsQuestions
  )

  if (!askRequirements.confirm) {
    console.log("Confirmação invalidada, saindo...")
    process.exit(1)
  }

  console.log("Abrindo navegador...")
  const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
  const browser = await puppeteer.launch({
    headless: process.env.OPEN_BROWSER === "0",
    devtools: false,
    args: ["--start-maximized"],
  })
  const context = await browser.createIncognitoBrowserContext()
  console.log("Abrindo página...")
  const page = await context.newPage()
  // await page.setCacheEnabled(false)
  // Warning: This link won't work, you need to replace COMPANY with your company name in cloud brasil
  await page.goto("https://myndware.io/login/COMPANY", { timeout: 0 })

  if (process.env.OPEN_BROWSER !== "0") {
    // Set screen size
    await page.setViewport({
      width: parseInt(process.env.CLOUD_WIDTH),
      height: parseInt(process.env.CLOUD_HEIGHT),
    })
  }

  // const element = await page.evaluate(() => document.querySelector('input[data-hdval="login.email"]'))
  await sleep(5000)
  console.log("Logando...")
  await page.type(
    // `input[aria-label="Usuário ou email"]`,
    `input[aria-label="Usuário ou email"]`,
    process.env.CLOUD_LOGIN
  )
  // await page.type(`input[aria-label="Senha"]`, process.env.CLOUD_PASSWORD)
  await page.type(`input[aria-label="Senha"]`, process.env.CLOUD_PASSWORD)
  await page.click(
    `button[class="q-btn q-btn-item non-selectable no-outline q-btn--unelevated q-btn--rectangle bg-primary text-white q-btn--actionable q-focusable q-hoverable q-btn--no-uppercase full-width"]`
  )
  await sleep(7000)

  console.log("Estamos logados.")

  const registerDocument = async () => {
    // Warning: This link won't work, you need to replace COMPANY with your company name in cloud brasil
    await page.goto("https://myndware.io/organization/COMPANY/documents/new", {
      timeout: 0,
    })
    await sleep(4000)
    await page.click(`a[class="introjs-skipbutton"]`)
    await sleep(1000)

    // Warning: The select options are generated dynamically based on the documents you have in your company, so I can't give you the exact value to select, you need to inspect the element and get the value of the option you want to select, then replace 'abunchofrandomnumbersandletters' with that value.
    await page.select(
      `select[data-hdval="docsnew.areaId"]`,
      "abunchofrandomnumbersandletters"
    ) // BASE DE DADOS
    await sleep(1000)
    await page.select(
      `select[data-hdval="docsnew.docTypeId"`,
      documentType[intent][bases[baseIntentIndex]]
    ) // 'abunchofrandomnumbersandletters' BASE MOTORISTAS - unit
    await sleep(3000)

    await page.evaluate(() => {
      document
        .querySelector('button[data-bind="click: docsnew.addNewDocument"]')
        .click()

      return Promise.resolve(true)
    })
    // await page.click(`button[data-bind="click: docsnew.addNewDocument"]`)

    await sleep(500)

    if (intent === "register_driver") {
      await page.type(
        `input[data-hdval="docsnew.extraNomeDoMotorista"]`,
        askRequirements.name
      )
      await page.type(
        `input[data-hdval="docsnew.extraPlacaDoVeiculo"]`,
        askRequirements.plate
      )
    } else {
      await page.type(
        `input[data-hdval="docsnew.extraCodigo"]`,
        askRequirements.code
      )
      await page.type(
        `input[data-hdval="docsnew.extraRazaoSocial"]`,
        askRequirements.social_reason
      )
    }

    await page.evaluate(() => {
      document
        .querySelector('button[data-bind="click: docsnew.createDocuments"]')
        .click()

      return Promise.resolve(true)
    })
    // await page.click(`button[data-bind="click: docsnew.createDocuments"]`)

    await sleep(900)
    if (process.env.HUMAN_CONFIRM !== "1") {
      await page.evaluate(() => {
        document.querySelector('button[data-bb-handler="confirm"]').click()

        return Promise.resolve(true)
      })

      if (process.env.CLOSE_AFTER_DONE === "1") {
        await sleep(5000)
        console.log("Feito, fechando o navegador...")
        browser.close()
        // process.exit(1)
      }
      // await page.click('button[data-bb-handler="confirm"]')
    }

    console.log("cadastrado")
  }

  const writeTerm = async () => {}

  const cloneTerm = async () => {
    const localTerms = await fsp.readFile(
      path.join(__dirname, "/termos_local.json"),
      { encoding: "utf-8" }
    )
    const terms = JSON.parse(localTerms).terms

    let page = 0
    const elementsPerPage = 10

    const collectTermsToChoice = () => {
      const endIndex = elementsPerPage * (page + 1)
      const startIndex = endIndex - elementsPerPage

      let choices = [
        {
          title: "Proxima Página",
          value: "next",
        },
        {
          title: "Página Anterior",
          value: "back",
        },
      ]

      for (let i = startIndex; i < endIndex; i++) {
        const term = terms[i]

        if (!term.owner.name && !term.equipment.name) {
          choices.push({
            title: `Sem Nome - Sem Equipamento - ${term.id}`,
            value: `${i}`,
          })
        } else {
          choices.push({
            title: `${term.owner.name || "Sem Nome"} - ${
              term.equipment.name || "Sem Equipamento"
            } (${term.equipment.model}) - ${term.id}`,
            value: `${i}`,
          })
        }
      }

      return choices
    }

    const generatePrompt = async () => {}

    const selectTerm = await prompts(
      {
        type: "multiselect",
        min: 1,
        max: 1,
        choices: collectTermsToChoice(),
        name: "term",
        message: "Selecione o termo que deseja clonar",
      },
      {
        type: (prev) => {
          if (["back", "next"].includes(prev)) {
            prev === "next" ? page++ : page--
            return "multiselect"
          }

          return null
        },
        name: "term",
        choices: () => {
          return collectTermsToChoice()
        },
        message: () => {
          return `Selecione o termo que deseja clonar (Página ${page + 1})`
        },
        min: 1,
        max: 1,
      }
    )
    // TODO: This dynamic shit won't work, make a recursive prompt function that exits when the selected term isn't 'next' or 'back'
    console.log(selectTerm)
  }

  const storeTerms = async () => {
    const confirmAttachments = await prompts({
      type: "confirm",
      name: "checkAttachment",
      message: "Verificar anexos em cada termo?",
      initial: true,
    })

    const checkAttachments = confirmAttachments.checkAttachment

    // WARNING: This link won't work, you need to replace COMPANY with your company name in cloud brasil
    await page.goto("https://myndware.io/organization/COMPANY/tasks/search", {
      timeout: 0,
    })
    console.log("Esperando um tempo...")
    await sleep(20000)

    console.log("Filtrando termos...")
    const terms = await page.$$(`div[class="email-info task-card-content"]`)
    // const termsAsObjects = []
    const limit = pLimit(3)

    console.log("Executando processo...")

    const processTerms = async (termDiv, i) => {
      console.log(`Verificando ${i + 1}º termo `)

      const termStats = await termDiv.evaluate((element) => {
        // console.log(element)

        const url = element.children[0].children[0].children[0].children[0].href
        const termDate = element.children[0].children[1].innerText
        const timeSince = element.children[0].children[3].innerText
        const identifier = element.children[1].children[0].children[0].innerText
        const id = element.children[1].children[0].children[2].innerText

        // WARNING: This is a very specific filter for my company, you should change it to fit your company's identifier pattern, or remove it if you don't have a pattern.
        if (!identifier.includes("(SUBCOMPANY1)") && !identifier.includes('SUBCOMPANY')) {
          return null
        }

        const termOwner = element.children[4]?.innerText || ""
        const termOwnerCPF = element.children[7]?.innerText || ""
        const termEquipment = element.children[10]?.innerText || ""
        const termEquipmentModel = element.children[13]?.innerText || ""
        const termSerialNumber = element.children[16]?.innerText || ""
        const termFollowedBy = element.children[19]?.innerText || ""
        const termCity = element.children[22]?.innerText || ""
        const termIndexDate = element.children[25]?.innerText || ""
        const termProject = element.children[28]?.innerText || ""

        if (!termOwner && !termOwnerCPF) {
          return null
        }

        const termInObject = {
          date: termDate,
          dateTimeSince: timeSince,
          id,
          owner: {
            name: termOwner,
            cpf: termOwnerCPF,
          },
          equipment: {
            name: termEquipment,
            sn: termSerialNumber,
            model: termEquipmentModel,
            followedBy: termFollowedBy,
          },
          city: termCity,
          dateIndex: termIndexDate,
          project: termProject,
          url,
          documentsAttached: [],
        }

        return termInObject
      })

      if (!termStats) {
        console.log("Invalidado.")
        return null
      }

      if (!termStats.owner.name && !termStats.owner.cpf) {
        console.log('Termo sem dono, Invalidado.')
        return null
      }

      if (!termStats.equipment.name && !termStats.equipment.sn && !termStats.equipment.model && !termStats.equipment.followedBy) {
        console.log('Termo sem equipamento, Invalidado.')
      }

      if (checkAttachments) {
        // TODO: This all should be done on another page and we should open at least 3 pages everytime, otherwise this will take a whole day to check everyting and we'll leak memory.
        const documentPage = await context.newPage()
        await documentPage.goto(termStats.url, { timeout: 60000 }).catch(async () => {
          console.log('Failed to open term', i, 'trying again...')
          await documentPage.goto(termStats.url, { timeout: 60000 })
        })

        await sleep(5000)

        let numberOfDocumentsAttached = await documentPage.evaluate(() => {
          return Promise.resolve(
            document.querySelector(
              `span[data-bind="text: hdsearch.selectedDocs().length"]`
            ).innerText
          )
        }).catch((err) => {
          console.log(`Erro no termo ${termStats.id}`)
          console.error(err)

          return 0
        })

        numberOfDocumentsAttached = parseInt(numberOfDocumentsAttached)
        console.log(
          `Number of documents attached: ${numberOfDocumentsAttached}`
        )

        if (numberOfDocumentsAttached >= 1) {
          const documents = await documentPage.evaluate(async () => {
            const documentList = document.querySelector(
              `div[class="row g-0 document-results ui-sortable"]`
            )
            const localDocuments = []

            for (let d = 0; d < documentList.children.length; d++) {
              const documentDiv =
                documentList.children[d].children[0].children[0]

              // Get Document Title
              const documentTitleSpan =
                documentDiv.children[0].children[0].children[2].children[0]
                  .children[0]
              documentTitleSpan.dispatchEvent(new Event("mouseover"))
              await new Promise((r) => setTimeout(r, 2000))
              // The tooltip is not instant

              const tooltipMotherfucker = document.querySelector(
                `div[id="qtip-${documentTitleSpan.getAttribute(
                  "data-hasqtip"
                )}-content"]`
              )

              const wholeDocumentName = tooltipMotherfucker.innerText
              // Get Document Details
              const documentInfo =
                documentDiv.children[1].children[0].children[0].children[2]
                  .children[0]
              const submittedBy = documentInfo.children[0].children[2].innerText
              const documentDate =
                documentInfo.children[1].children[2].innerText
              const documentCreationDate =
                documentInfo.children[2].children[2].innerText

              const typeOfDocument = (documentName) => {
                documentName = documentName.toLowerCase()

                if (
                  documentName.includes("devolucao") ||
                  documentName.includes("devolução") ||
                  documentName.includes("devoluçao") ||
                  documentName.includes("devolucão")
                ) {
                  return "DEVOLUÇÃO"
                }

                if (documentName.includes("recebimento")) {
                  return "RECEBIMENTO"
                }

                return "DESCONHECIDO"
              }

              localDocuments.push({
                name: wholeDocumentName,
                submittedBy,
                documentDate,
                documentCreationDate,
                documentType: typeOfDocument(wholeDocumentName),
              })
            }

            const localDocumentString = JSON.stringify(localDocuments)

            return Promise.resolve(localDocumentString)
          })

          const parsedDocuments = JSON.parse(documents)
          console.log(parsedDocuments)
          termStats.documentsAttached = parsedDocuments
        }
        await documentPage.close()
      }

      return termStats
      // termsAsObjects.push(termStats)
    }

    const maxPagesPerTasks = 100
    const tasksNeeded = Math.ceil(terms.length / maxPagesPerTasks)
    /*
    I tried to run a single tasks starting from term 0 till the last term
    I got a timeout when it reached term 202
    */
    const endTasks = []

    for (let t = 0; t < tasksNeeded; t++) {
      console.log(`Start from term ${maxPagesPerTasks * t} to term ${(maxPagesPerTasks * t) + maxPagesPerTasks}.`)
      const tasks = terms.slice(maxPagesPerTasks * t, (maxPagesPerTasks * t) + maxPagesPerTasks).map((termDiv, i) => limit(() => processTerms(termDiv, i)))
      // const tasks = terms.slice(150, 300).map((termDiv, i) => limit(() => processTerms(termDiv, i)))

      let results = await Promise.all(tasks).catch((err) => {
        console.error(err)
        console.log(`Problem happened at run ${t}`)
      })

      results = results.filter(e => e !== null)
      endTasks.push(results)

      console.log('Escrevendo parte...')
      await fsp.writeFile(
        path.join(__dirname, `/termos_local_${t}.json`),
        JSON.stringify({ terms: endTasks.flat()}, undefined, 4),
        { encoding: "utf-8" }
      )

      console.log('Aguardando um tempo antes de começar...')
      await sleep(15000)
    }

    // TODO: Myndware can randomly timeout a page, so we should parse 150, write and then try the next 150, repeat.
    const localTermsJSON = {
      terms: endTasks.flat(),
    }

    console.log("Processo terminado, escrevendo no arquivo local...")
    await fsp.writeFile(
      path.join(__dirname, "/termos_local.json"),
      JSON.stringify(localTermsJSON, undefined, 4),
      { encoding: "utf-8" }
    )
    await browser.close()
  }

  // await registerDocument()
  await storeTerms()
  // await cloneTerm()
  // console.log(element)
})()
