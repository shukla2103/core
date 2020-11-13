<?php

/*
 * This file is part of Flarum.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace Flarum\Filter;

interface FilterInterface
{
    /**
     * This filter will only be run when a query contains a filter param with this key.
     */
    public function getKey(): string;

    /**
     * Filters a query.
     *
     * @param WrappedFilter $filter
     * @param string $value The value of the requested filter
     */
    public function apply(WrappedFilter $wrappedFilter, $filterValue);
}