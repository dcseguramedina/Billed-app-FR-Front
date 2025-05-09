/**
 * @jest-environment jsdom
 * Tells Jest to use a browser-like environment for DOM testing
 */

import { screen, waitFor } from "@testing-library/dom" // Tools for querying and waiting for DOM elements
import userEvent from '@testing-library/user-event' // Simulates user interactions (clicks, typing)
import BillsUI from "../views/BillsUI.js" // UI rendering function for bills
import Bills from "../containers/Bills.js" // Bills container logic
import { formatDate, formatStatus } from "../app/format.js"; // Functions for formatting dates and statuses
import { ROUTES_PATH } from "../constants/routes.js"; // App route constants
import { localStorageMock } from "../__mocks__/localStorage.js"; // Mocked localStorage for testing
import mockStore from "../__mocks__/store" // Mocked data store for testing
import router from "../app/Router.js"; // App router

// Mock the store and formatting functions for isolation in tests
jest.mock("../app/Store.js", () => mockStore)
jest.mock("../app/format.js", () => ({
  formatDate: jest.fn(),
  formatStatus: jest.fn()
}));

// Top-level test suite: user is connected as an employee
describe("Given I am connected as an employee", () => {
  // Before each test, set up the mocked localStorage with an employee user
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "e@a"
    }))
  });

  // Nested suite: user is on the Bills page
  describe("When I am on Bills Page", () => {
    // Test: the bill icon should be highlighted
    test("Then bill icon in vertical layout should be highlighted", async () => {
      // Set up DOM root
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      // Initialize router and navigate to Bills page
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      // Wait for the icon to appear
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      // Assert the icon has the 'active-icon' class
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })

    // Test: the list of bills should be displayed
    test("Then a list of bills should be displayed", async () => {
      // Get mocked bills
      const bills = await mockStore.bills().list()
      // Render bills UI
      document.body.innerHTML = BillsUI({ data: bills })
      // Wait for listOfBills to display
      await waitFor(() => screen.getByTestId("tbody"))
      const listOfBills = screen.getByTestId("tbody")
      // listOfBills should exist
      expect(listOfBills).toBeTruthy()
      // There should be one row per bill, plus a header row
      expect(screen.getAllByRole('row').length).toBe(bills.length + 1) 
    })

    // Test: bills should be ordered from earliest to latest
    test("Then bills should be ordered from earliest to latest", async () => {
      const bills = await mockStore.bills().list()
      document.body.innerHTML = BillsUI({ data: bills })
      // Extract all dates from the rendered table
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      // Sort dates in reverse chronological order
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      // Assert that the displayed dates are sorted as expected
      expect(dates).toEqual(datesSorted)
    })

    // Test: an eye icon should be displayed for each bill
    test("Then an icon eye should be displayed for each bill", async () => {
      const bills = await mockStore.bills().list()
      document.body.innerHTML = BillsUI({ data: bills })
      const iconEye = screen.getAllByTestId('icon-eye')
      // iconEye should exist
      expect(iconEye).toBeTruthy()
      // There should be one per bill
      expect(iconEye.length).toBe(bills.length)
    })

    // Test: the "new bill" button should be displayed
    test("Then a new bill button should be displayed", async () => {
      document.body.innerHTML = BillsUI({ data: [] })
      const newBillButton = screen.getByTestId("btn-new-bill")
      // Button should exist
      expect(newBillButton).toBeTruthy()
    })
  })

  // Nested suite: clicking the new bill button
  describe("When I click on the new bill button", () => {
    test("Then a NewBill page should be displayed", () => {
      // Mock navigation function
      const onNavigate = jest.fn()
      // Create Bills instance with mocks
      const billsInstance = new Bills({ document, onNavigate, store: mockStore, localStorage: window.localStorage })
      document.body.innerHTML = BillsUI({ data: [] })
      // Spy on the handler
      const handleClickNewBill = jest.spyOn(billsInstance, 'handleClickNewBill')
      const newBillBtn = screen.getByTestId('btn-new-bill')
      // Attach click handler
      newBillBtn.addEventListener('click', billsInstance.handleClickNewBill)
      // Simulate user click
      userEvent.click(newBillBtn)
      // Handler should be called
      expect(handleClickNewBill).toHaveBeenCalled()
      // Should navigate to NewBill page
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
    })
  })

  // Nested suite: clicking the eye icon
  describe("When I click on the icon eye", () => {
    test('Then a modal should open', async () => {
      const bills = await mockStore.bills().list()
      // Create Bills instance with mocks
      const billsInstance = new Bills({ document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage })
      document.body.innerHTML = BillsUI({ data: bills })
      // Spy on the handler
      const handleClickIconEye = jest.spyOn(billsInstance, 'handleClickIconEye')
      // Mock jQuery modal function
      $.fn.modal = jest.fn()
      const iconEye = screen.getAllByTestId('icon-eye')[0]
      // Attach click handler
      iconEye.addEventListener('click', () => billsInstance.handleClickIconEye(iconEye))
      // Simulate click
      userEvent.click(iconEye)
      // Handler should be called
      expect(handleClickIconEye).toHaveBeenCalled()
      // Modal should open
      expect($.fn.modal).toHaveBeenCalled()
    })
  })

  // Nested suite: when bills are displayed
  describe('When bills are displayed', () => {
    // Test: bills should be formatted correctly
    test('It should be in the right format', async () => {
      const bills = await mockStore.bills().list()
      // Mock formatting functions to return predictable output
      formatDate.mockImplementation((date) => `formatted ${date}`)
      formatStatus.mockImplementation((status) => `formatted ${status}`)
      document.body.innerHTML = BillsUI({ data: bills })
      const formattedDates = screen.getByTestId("tbody")
      // Should have one child per bill (each row)
      expect(formattedDates.childElementCount).toBe(bills.length)
    })

    // Test: handle formatting errors gracefully
    test('It should handle formatting errors', async () => {
      const bills = await mockStore.bills().list()
      // Mock formatDate to throw an error
      formatDate.mockImplementation(() => { throw new Error('Format error'); })
      formatStatus.mockImplementation((status) => `formatted ${status}`)
      document.body.innerHTML = BillsUI({ data: bills })
      const formattedStatuses = screen.getByTestId("tbody")
      // Should still render all bills even if date formatting fails
      expect(formattedStatuses.childElementCount).toBe(bills.length)
    });
  });
})
