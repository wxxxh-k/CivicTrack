from .geometry import haversine


def cluster_reports(reports, radius_m=30.0):
    """Group reports of the same category within radius_m of each other (greedy, anchored on the first)."""
    clusters = []
    for r in reports:
        placed = False
        if r.lat is not None:
            for c in clusters:
                h = c[0]
                if h.lat is not None and h.category == r.category and haversine(h.lat, h.lng, r.lat, r.lng) <= radius_m:
                    c.append(r)
                    placed = True
                    break
        if not placed:
            clusters.append([r])
    return clusters
