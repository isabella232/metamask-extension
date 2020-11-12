// Type Imports
/**
 * @typedef {import('../../app/scripts/lib/enums').EnvironmentType} EnvironmentType
 */

// Type Declarations
/**
 * @typedef {Object} MetaMetricsPageObject
 * @property {string} [path] - the path of the current page (e.g /home)
 * @property {string} [title] - the title of the current page (e.g 'home')
 * @property {string} [url] - the fully qualified url of the current page
 */

/**
 * We attach context to every meta metrics event that help to qualify our
 * analytics. This type has all optional values because it represents a
 * returned object from a method call. Ideally app and userAgent are
 * defined on every event. This is confirmed in the getTrackMetaMetricsEvent
 * function, but still provides the consumer a way to override these values if
 * necessary.
 * @typedef {Object} MetaMetricsContext
 * @property {Object} app
 * @property {string} app.name - the name of the application tracking the event
 * @property {string} app.version - the version of the application
 * @property {string} userAgent - the useragent string of the user
 * @property {MetaMetricsPageObject} [page]     - an object representing details
 *  of the current page
 * @property {Object} [referrer] - for metamask, this is the dapp that triggered
 *  an interaction
 * @property {string} [referrer.url] - the origin of the dapp issuing the
 *  notification
 */

/**
 * @typedef {Object} MetaMetricsEventPayload
 * @property {string}  event - event name to track
 * @property {string}  category - category to associate event to
 * @property {string} [environmentType] - The type of environment this event
 *  occurred in. Defaults to the background process type
 * @property {object}  [properties] - object of custom values to track, keys
 *  in this object must be in snake_case
 * @property {object}  [sensitiveProperties] - Object of sensitive values to
 *  track. Keys in this object must be in snake_case. These properties will be
 *  sent in an additional event that excludes the user's metaMetricsId
 * @property {number}  [revenue] - amount of currency that event creates in
 *  revenue for MetaMask
 * @property {string}  [currency] - ISO 4127 format currency for events with
 *  revenue, defaults to US dollars
 * @property {number}  [value] - Abstract business "value" attributable to
 *  customers who trigger this event
 * @property {MetaMetricsDynamicContext} [eventContext] - additional context
 *  to attach to event
 */

/**
 * @typedef {Object} MetaMetricsEventOptions
 * @property {boolean} [isOptIn] - happened during opt in/out workflow
 * @property {boolean} [flushImmediately] - When true will automatically flush
 *  the segment queue after tracking the event. Recommended if the result of
 *  tracking the event must be known before UI transition or update
 * @property {boolean} [excludeMetaMetricsId] - whether to exclude the user's
 *  metametrics id for anonymity
 * @property {string}  [metaMetricsId] - an override for the metaMetricsId in
 *  the event one is created as part of an asynchronous workflow, such as
 *  awaiting the result of the metametrics opt-in function that generates the
 *  user's metametrics id
 * @property {boolean} [matomoEvent] - is this event a holdover from matomo
 *  that needs further migration? when true, sends the data to a special
 *  segment source that marks the event data as not conforming to our schema
 * @property {number} metaMetricsSendCount - the count of the number of sends
 *  that have triggered a metrics event used to determine if we should allow
 *  the user's id to be included in the payload periodically
 */

export const METAMETRICS_ANONYMOUS_ID = '0x0000000000000000'

/**
 * This object is used
 */
export const METAMETRICS_BACKGROUND_PAGE_OBJECT = {
  path: '/background-process',
  title: 'Background Process',
  url: '/background-process',
}

// flushAt controls how many events are sent to segment at once. Segment will
// hold onto a queue of events until it hits this number, then it sends them as
// a batch. This setting defaults to 20, but in development we likely want to
// see events in real time for debugging, so this is set to 1 to disable the
// queueing mechanism.
export const SEGMENT_FLUSH_AT =
  process.env.METAMASK_ENVIRONMENT === 'production' ? undefined : 1

// flushInterval controls how frequently the queue is flushed to segment.
// This happens regardless of the size of the queue. The default setting is
// 10,000ms (10 seconds). This default is rather high, though thankfully
// using the background process as our event handler means we don't have to
// deal with short lived sessions that happen faster than the interval
// e.g confirmations. This is set to 5,000ms (5 seconds) arbitrarily with the
// intent of having a value less than 10 seconds.
export const SEGMENT_FLUSH_INTERVAL = 5000

/**
 * Creates a mock segment module for usage in test environments. This is used
 * when building the application in test mode to catch event calls and prevent
 * them from being sent to segment. It is also used in unit tests to mock and
 * spy on the methods to ensure proper behavior
 * @param {number} flushAt - number of events to queue before sending to segment
 * @param {nmber} flushInterval - ms interval to flush queue and send to segment
 */
export const createSegmentMock = (flushAt, flushInterval) => {
  const segmentMock = {
    // Internal queue to keep track of events and properly mimic segment's
    // queueing behavior.
    queue: [],

    /**
     * Used to immediately send all queued events and reset the queue to zero.
     * For our purposes this simply triggers the callback method registered with
     * the event.
     */
    flush() {
      segmentMock.queue.forEach(([_, callback]) => {
        callback()
      })
      segmentMock.queue = []
    },

    /**
     * Track an event and add it to the queue. If the queue size reaches the
     * flushAt threshold, flush the queue.
     */
    track(payload, callback = () => undefined) {
      segmentMock.queue.push([payload, callback])

      if (segmentMock.queue.length >= flushAt) {
        segmentMock.flush()
      }
    },

    /**
     * A true NOOP, these methods are either not used or do not await callback
     * and therefore require no functionality.
     */
    page() {
      // noop
    },
    identify() {
      // noop
    },
  }
  // Mimic the flushInterval behavior with an interval
  setInterval(segmentMock.flush, flushInterval)
  return segmentMock
}