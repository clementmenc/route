/**
 * @izzyjs/route
 *
 * (c) IzzyJs - 2024
 * For the full license information, please view the LICENSE file that was distributed with this source code.
 */
import type { GlobalIzzyJs, Method, SerializedRoute } from './types/manifest.js'
import { isBrowser } from './utils/is_browser.js'

// @ts-ignore
import type { RouteName } from './client/routes.js'
import type { ExcludeName, ExtractName, Params } from './types/routes.js'

export class Route extends String {
  /**
   * A route path string that can be used to generate URLs
   * @deprecated use `path` instead
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' })
   * console.log(route.url) // /users/1
   * ```
   */
  readonly url: string

  /**
   * The HTTP method for the route
   */
  readonly method: Method

  /**
   * The route parameters as an array
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' })
   * console.log(route.params) // ['id']
   * ```
   */
  readonly params: string[] | undefined

  /**
   * The route name as a string
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' })
   * console.log(route.name) // user.show
   * ```
   */
  readonly name: string

  /**
   * The route pattern
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' })
   * console.log(route.pattern) // /users/:id
   * ```
   */
  readonly pattern: string

  /**
   * The route path with parameters replaced
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' })
   * console.log(route.path) // /users/1
   * ```
   */
  readonly path: string

  /**
   * The query string
   * @example
   * ```ts
   * const route = Route.new('user.show', { id: '1' }, { page: 1 })
   * console.log(route.qs.toString()) // page=1
   * ```
   */
  readonly qs: URLSearchParams

  private constructor(
    routeName?: string,
    params?: Record<string, string>,
    qs: Record<string, any> = {},
    prefix = ''
  ) {
    const { routes } = Route.izzy()

    const exist = routes.find((r) => 'name' in r && r.name === routeName)

    if (!exist) {
      throw new Error(`Route with name "${routeName}" not found`)
    }

    const searchParams = new URLSearchParams(qs)

    let pattern: string

    if ('params' in exist && exist.params) {
      if (!params) {
        throw new Error(
          `Route "${routeName}" requires parameters: ${exist.params.map((p: string) => `"${p}"`).join(', ')}`
        )
      }

      pattern = Route.replaceRouteParams(exist.path, params as Record<string, string>)
    } else {
      pattern = exist.path
    }

    if (searchParams.toString()) {
      pattern += `?${searchParams.toString()}`
    }

    if (prefix) {
      pattern = prefix + pattern
    }

    super(pattern)

    this.url = pattern
    this.path = pattern
    this.name = exist.name
    this.method = exist.method
    this.params = exist.params
    this.pattern = exist.path
    this.qs = searchParams
  }

  static replaceRouteParams(routePath: string, params: Record<string, string>) {
    return Object.entries(params).reduce(
      (acc, [key, value]) => acc.replace(`:${key}`, value),
      routePath
    )
  }

  /**
   * Create a new `Route` instance
   * @param routeName The route name
   * @param params The route parameters
   * @param qs The query string
   * @param prefix The route prefix
   */
  static new(routeName: unknown, params: unknown, qs?: unknown, prefix?: string): Route

  /**
   * Create a new `Route` instance
   * @param routeName The route name
   */
  static new(routeName: unknown): Route

  /**
   * Create a new `Routes` instance
   */
  static new(): Routes

  static new(routeName?: unknown, params?: unknown, qs?: unknown, prefix?: string): Route | Routes {
    if (!routeName) {
      return new Routes()
    }

    return new Route(
      routeName as string,
      params as Record<string, string>,
      qs as Record<string, any>,
      prefix
    )
  }

  /**
   * Get the `Route` instance from the global Izzy object
   * @returns { GlobalIzzyJs }
   */
  static izzy(): GlobalIzzyJs {
    let routes: SerializedRoute[]
    let currentRoute: string

    if (isBrowser()) {
      routes = window.__izzy_route__.routes
      currentRoute = window.location.pathname
    } else {
      routes = globalThis.__izzy_route__.routes
      currentRoute = globalThis.__izzy_route__.current
    }

    return { routes, current: currentRoute }
  }

  toString() {
    return this.path
  }
}

export class Routes {
  private readonly currentRoute: string
  readonly routes: SerializedRoute[]

  constructor() {
    const { routes, current: currentRoute } = Route.izzy()

    this.routes = routes
    this.currentRoute = currentRoute
  }

  /**
   * Check if the current route matches the given route name and parameters
   * @summary unstable
   * @example
   * ```ts
   * route().current() // => "/users"
   * ```
   */
  current(): RouteName

  /**
   * Check if the current route matches the given route name and parameters
   * @summary unstable
   * @param routeName route name
   * @param params route parameters
   * @example
   * ```ts
   * // current route is 'GET /users/1'
   * route().current('users.show', { id: '1' }) // => true
   * route().current('users.show', { id: '2' }) // => false
   * ```
   */
  current<Name extends ExtractName>(routeName: Name, params: Params<Name>): boolean

  /**
   * Check if the current route matches the given route name
   * @summary unstable
   * @param routeName route name
   * @example
   * ```ts
   * // current route is 'GET /users/1'
   * route().current('users.show') // => true
   * route().current('user.*') // => true
   * route().current('todos.*') // => false
   * ```
   */
  current<Name extends ExcludeName['name']>(routeName: Name, params?: never): boolean
  current(routeName?: string, params?: unknown): RouteName | boolean {
    if (!routeName) {
      return this.currentRoute
    }

    if (routeName.includes('*')) {
      const regex = new RegExp(routeName.replace(/\*/g, '.*'))

      return regex.test(this.currentRoute)
    }

    const route = Route.new(routeName, params)

    return this.currentRoute === route.toString()
  }

  /**
   * Check if the current route has the given route name
   * @summary unstable
   * @param routeName route name
   * @example
   * ```ts
   * route().has('users.index') // => true or false
   * route().has('user.*') // => true or false
   * ```
   */
  has<T extends string>(routeName: T) {
    if (routeName.includes('*')) {
      const regex = new RegExp(routeName.replace(/\*/g, '.*'))

      return this.routes.some((r) => 'name' in r && regex.test(r.name))
    }

    return this.routes.some((r) => 'name' in r && r.name === routeName)
  }

  get params(): Record<string, string> {
    const route = this.routes.find(({ path }) => {
      const regex = new RegExp(
        path
          .split('/')
          .map((p) => (p.startsWith(':') ? '([^/]+)' : p))
          .join('/')
      )

      return regex.test(this.currentRoute)
    })

    if (route && route.params) {
      const regex = new RegExp(
        route.path
          .split('/')
          .map((p) => (p.startsWith(':') ? '([^/]+)' : p))
          .join('/')
      )

      const values = this.currentRoute.match(regex)

      if (!values) {
        return {}
      }

      return route.params.reduce(
        (acc, param, index) => ({
          ...acc,
          [param]: values[index + 1],
        }),
        {}
      )
    }

    return {}
  }
}
