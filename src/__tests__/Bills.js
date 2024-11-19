/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { formatDate, formatStatus } from "../app/format.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";

jest.mock("../app/Store.js", () => mockStore)
jest.mock("../app/format.js", () => ({
  formatDate: jest.fn(),
  formatStatus: jest.fn()
}));

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "e@a"
    }))
  });

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })

    test("Then a list of bills should be displayed", async () => {
      const bills = await mockStore.bills().list()
      document.body.innerHTML = BillsUI({ data: bills })
      await waitFor(() => screen.getByTestId("tbody"))
      const listOfBills = screen.getByTestId("tbody")
      expect(listOfBills).toBeTruthy()
      expect(screen.getAllByRole('row').length).toBe(bills.length + 1) // +1 for header row
    })

    test("Then bills should be ordered from earliest to latest", async () => {
      const bills = await mockStore.bills().list()
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then an icon eye should be displayed for each bill", async () => {
      const bills = await mockStore.bills().list()
      document.body.innerHTML = BillsUI({ data: bills })
      const iconEye = screen.getAllByTestId('icon-eye')
      expect(iconEye).toBeTruthy()
      expect(iconEye.length).toBe(bills.length)
    })

    test("Then a new bill button should be displayed", async () => {
      document.body.innerHTML = BillsUI({ data: [] })
      const newBillButton = screen.getByTestId("btn-new-bill")
      expect(newBillButton).toBeTruthy()
    })
  })

  describe("When I click on the new bill button", () => {
    test("Then a NewBill page should be displayed", () => {
      const onNavigate = jest.fn()
      const billsInstance = new Bills({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
      document.body.innerHTML = BillsUI({ data: [] })
      const handleClickNewBill = jest.spyOn(billsInstance, 'handleClickNewBill')
      const newBillBtn = screen.getByTestId('btn-new-bill')
      newBillBtn.addEventListener('click', billsInstance.handleClickNewBill)
      userEvent.click(newBillBtn)
      expect(handleClickNewBill).toHaveBeenCalled()
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
    })
  })

  describe("When I click on the icon eye", () => {
    test('Then a modal should open', async () => {
      const bills = await mockStore.bills().list()
      const billsInstance = new Bills({ document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage })
      document.body.innerHTML = BillsUI({ data: bills })
      const handleClickIconEye = jest.spyOn(billsInstance, 'handleClickIconEye')
      $.fn.modal = jest.fn() // Mock jQuery modal function
      const iconEye = screen.getAllByTestId('icon-eye')[0]
      iconEye.addEventListener('click', () => billsInstance.handleClickIconEye(iconEye))
      userEvent.click(iconEye)
      expect(handleClickIconEye).toHaveBeenCalled()
      expect($.fn.modal).toHaveBeenCalled()
    })
  })

  describe('When bills are displayed', () => {
    test('It should be in the right format', async () => {
      const bills = await mockStore.bills().list()
      formatDate.mockImplementation((date) => `formatted ${date}`)
      formatStatus.mockImplementation((status) => `formatted ${status}`)
      document.body.innerHTML = BillsUI({ data: bills })
      const formattedDates = screen.getByTestId("tbody")
      expect(formattedDates.childElementCount).toBe(bills.length) // Date and status for each bill
    })

    test('It should handle formatting errors', async () => {
      const bills = await mockStore.bills().list()
      formatDate.mockImplementation(() => { throw new Error('Format error'); })
      formatStatus.mockImplementation((status) => `formatted ${status}`)
      document.body.innerHTML = BillsUI({ data: bills })
      const formattedStatuses = screen.getByTestId("tbody")
      expect(formattedStatuses.childElementCount).toBe(bills.length) // Only statuses should be formatted
    });
  });
})

// test d'intégration GET
describe("Given I am connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: "e@a" }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.appendChild(root)
      router()
    })
    test("Then bilss are fetched from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByText("Mes notes de frais"))
      const listOfBills = await screen.getByTestId("tbody")
      expect(listOfBills).toBeTruthy()
    })

    describe("When an error occurs on API", () => {
      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})
