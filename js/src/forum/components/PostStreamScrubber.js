import Component from '../../common/Component';
import icon from '../../common/helpers/icon';
import formatNumber from '../../common/utils/formatNumber';

/**
 * The `PostStreamScrubber` component displays a scrubber which can be used to
 * navigate/scrub through a post stream.
 *
 * ### Props
 *
 * - `state`
 * - `className`
 */
export default class PostStreamScrubber extends Component {
  init() {
    this.state = this.props.state;
    this.handlers = {};
  }

  view() {
    const index = this.state.index;
    const count = this.state.count();
    const visible = this.state.visible || 1;
    const unreadCount = this.state.discussion.unreadCount();
    const unreadPercent = count ? Math.min(count - this.state.index, unreadCount) / count : 0;

    const viewing = app.translator.transChoice('core.forum.post_scrubber.viewing_text', count, {
      index: <span className="Scrubber-index">{formatNumber(Math.min(Math.ceil(index + visible), count))}</span>,
      count: <span className="Scrubber-count">{formatNumber(count)}</span>,
    });

    function styleUnread(element, isInitialized, context) {
      const $element = $(element);
      const newStyle = {
        top: 100 - unreadPercent * 100 + '%',
        height: unreadPercent * 100 + '%',
      };

      if (context.oldStyle) {
        $element.stop(true).css(context.oldStyle).animate(newStyle);
      } else {
        $element.css(newStyle);
      }

      context.oldStyle = newStyle;
    }

    const percentPerPost = this.percentPerPost();
    const beforeHeight = Math.max(0, percentPerPost.index * Math.min(index, count - visible));
    const handleHeight = Math.min(100 - beforeHeight, percentPerPost.visible * visible);
    const afterHeight = 100 - beforeHeight - handleHeight;

    const classNames = ['PostStreamScrubber', 'Dropdown'];
    if (this.state.allVisible) classNames.push('disabled');
    if (this.dragging) classNames.push('dragging');
    if (this.props.className) classNames.push(this.props.className);

    return (
      <div className={classNames.join(' ')}>
        <button className="Button Dropdown-toggle" data-toggle="dropdown">
          {viewing} {icon('fas fa-sort')}
        </button>

        <div className="Dropdown-menu dropdown-menu">
          <div className="Scrubber">
            <a className="Scrubber-first" onclick={this.goToFirst.bind(this)}>
              {icon('fas fa-angle-double-up')} {app.translator.trans('core.forum.post_scrubber.original_post_link')}
            </a>

            <div className="Scrubber-scrollbar">
              <div className="Scrubber-before" style={{ height: beforeHeight + '%' }} />
              <div className="Scrubber-handle" style={{ height: handleHeight + '%' }}>
                <div className="Scrubber-bar" />
                <div className="Scrubber-info">
                  <strong>{viewing}</strong>
                  <span className="Scrubber-description">{this.state.description}</span>
                </div>
              </div>
              <div className="Scrubber-after" style={{ height: afterHeight + '%' }} />

              <div className="Scrubber-unread" config={styleUnread}>
                {app.translator.trans('core.forum.post_scrubber.unread_text', { count: unreadCount })}
              </div>
            </div>

            <a className="Scrubber-last" onclick={this.goToLast.bind(this)}>
              {icon('fas fa-angle-double-down')} {app.translator.trans('core.forum.post_scrubber.now_link')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Get the percentage of the height of the scrubber that should be allocated
   * to each post.
   *
   * @return {Object}
   * @property {Number} index The percent per post for posts on either side of
   *     the visible part of the scrubber.
   * @property {Number} visible The percent per post for the visible part of the
   *     scrubber.
   */
  percentPerPost() {
    const count = this.state.count() || 1;
    const visible = this.state.visible || 1;

    // To stop the handle of the scrollbar from getting too small when there
    // are many posts, we define a minimum percentage height for the handle
    // calculated from a 50 pixel limit. From this, we can calculate the
    // minimum percentage per visible post. If this is greater than the actual
    // percentage per post, then we need to adjust the 'before' percentage to
    // account for it.
    const minPercentVisible = (50 / this.$('.Scrubber-scrollbar').outerHeight()) * 100;
    const percentPerVisiblePost = Math.max(100 / count, minPercentVisible / visible);
    const percentPerPost = count === visible ? 0 : (100 - percentPerVisiblePost * visible) / (count - visible);

    return {
      index: percentPerPost,
      visible: percentPerVisiblePost,
    };
  }

  /**
   * Go to the first post in the discussion.
   */
  goToFirst() {
    this.state.goToFirst();
  }

  /**
   * Go to the last post in the discussion.
   */
  goToLast() {
    this.state.goToLast();
  }

  config(isInitialized, context) {
    if (isInitialized) return;

    context.onunload = this.ondestroy.bind(this);

    // Whenever the window is resized, adjust the height of the scrollbar
    // so that it fills the height of the sidebar.
    $(window)
      .on('resize', (this.handlers.onresize = this.onresize.bind(this)))
      .resize();

    // When any part of the whole scrollbar is clicked, we want to jump to
    // that position.
    this.$('.Scrubber-scrollbar')
      .bind('click', this.onclick.bind(this))

      // Now we want to make the scrollbar handle draggable. Let's start by
      // preventing default browser events from messing things up.
      .css({ cursor: 'pointer', 'user-select': 'none' })
      .bind('dragstart mousedown touchstart', (e) => e.preventDefault());

    // When the mouse is pressed on the scrollbar handle, we capture some
    // information about its current position. We will store this
    // information in an object and pass it on to the document's
    // mousemove/mouseup events later.
    this.dragging = false;
    this.mouseStart = 0;
    this.indexStart = 0;

    this.$('.Scrubber-handle')
      .css('cursor', 'move')
      .bind('mousedown touchstart', this.onmousedown.bind(this))

      // Exempt the scrollbar handle from the 'jump to' click event.
      .click((e) => e.stopPropagation());

    // When the mouse moves and when it is released, we pass the
    // information that we captured when the mouse was first pressed onto
    // some event handlers. These handlers will move the scrollbar/stream-
    // content as appropriate.
    $(document)
      .on('mousemove touchmove', (this.handlers.onmousemove = this.onmousemove.bind(this)))
      .on('mouseup touchend', (this.handlers.onmouseup = this.onmouseup.bind(this)));
  }

  ondestroy() {
    $(window).off('resize', this.handlers.onresize);

    $(document).off('mousemove touchmove', this.handlers.onmousemove).off('mouseup touchend', this.handlers.onmouseup);
  }

  onresize() {
    // Adjust the height of the scrollbar so that it fills the height of
    // the sidebar and doesn't overlap the footer.
    const scrubber = this.$();
    const scrollbar = this.$('.Scrubber-scrollbar');

    scrollbar.css(
      'max-height',
      $(window).height() -
        scrubber.offset().top +
        $(window).scrollTop() -
        parseInt($('#app').css('padding-bottom'), 10) -
        (scrubber.outerHeight() - scrollbar.outerHeight())
    );
  }

  onmousedown(e) {
    this.mouseStart = e.clientY || e.originalEvent.touches[0].clientY;
    this.indexStart = this.state.index;
    this.dragging = true;
    $('body').css('cursor', 'move');
  }

  onmousemove(e) {
    if (!this.dragging) return;

    // Work out how much the mouse has moved by - first in pixels, then
    // convert it to a percentage of the scrollbar's height, and then
    // finally convert it into an index. Add this delta index onto
    // the index at which the drag was started, and then scroll there.
    const deltaPixels = (e.clientY || e.originalEvent.touches[0].clientY) - this.mouseStart;
    const deltaPercent = (deltaPixels / this.$('.Scrubber-scrollbar').outerHeight()) * 100;
    const deltaIndex = deltaPercent / this.percentPerPost().index || 0;
    const newIndex = Math.min(this.indexStart + deltaIndex, this.state.count() - 1);

    this.state.index = Math.max(0, newIndex);
    m.redraw();
  }

  onmouseup() {
    if (!this.dragging) return;

    this.mouseStart = 0;
    this.indexStart = 0;
    this.dragging = false;
    $('body').css('cursor', '');

    this.$().removeClass('open');

    // If the index we've landed on is in a gap, then tell the stream-
    // content that we want to load those posts.
    const intIndex = Math.floor(this.state.index);
    this.state.goToIndex(intIndex);
  }

  onclick(e) {
    // Calculate the index which we want to jump to based on the click position.

    // 1. Get the offset of the click from the top of the scrollbar, as a
    //    percentage of the scrollbar's height.
    const $scrollbar = this.$('.Scrubber-scrollbar');
    const offsetPixels = (e.pageY || e.originalEvent.touches[0].pageY) - $scrollbar.offset().top + $('body').scrollTop();
    let offsetPercent = (offsetPixels / $scrollbar.outerHeight()) * 100;

    // 2. We want the handle of the scrollbar to end up centered on the click
    //    position. Thus, we calculate the height of the handle in percent and
    //    use that to find a new offset percentage.
    offsetPercent = offsetPercent - parseFloat($scrollbar.find('.Scrubber-handle')[0].style.height) / 2;

    // 3. Now we can convert the percentage into an index, and tell the stream-
    //    content component to jump to that index.
    let offsetIndex = offsetPercent / this.percentPerPost().index;
    offsetIndex = Math.max(0, Math.min(this.state.count() - 1, offsetIndex));
    this.state.goToIndex(Math.floor(offsetIndex));

    this.$().removeClass('open');
  }
}